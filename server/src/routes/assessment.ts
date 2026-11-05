import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, todayMY } from "../db.js";
import { requireStudent, requireTeacher } from "../auth.js";
import { SKILL_IDS, type Lang } from "../content/curriculum.js";
import { AiError } from "../ai/client.js";
import { gradeAnswer, type RubricItem } from "../ai/grader.js";
import { addXp } from "../learning.js";
import { readImage, saveImage, UploadError } from "../uploads.js";

interface AssignmentRow {
  id: number;
  class_id: number;
  title: string;
  skill: string | null;
  prompt: string;
  rubric_json: string;
  max_score: number;
  due_date: string | null;
  created_at: string;
}
interface SubmissionRow {
  id: number;
  assignment_id: number;
  student_id: number;
  answer_text: string | null;
  image: string | null;
  status: "submitted" | "ai_graded" | "approved";
  ai_json: string | null;
  ai_score: number | null;
  ai_confidence: number | null;
  final_score: number | null;
  final_json: string | null;
  teacher_note: string | null;
  submitted_at: string;
  graded_at: string | null;
  approved_at: string | null;
}

const Rubric = z
  .array(
    z.object({
      criterion: z.string().trim().min(1).max(80),
      max: z.number().int().min(1).max(20),
      descriptor: z.string().trim().min(1).max(300),
    }),
  )
  .min(1)
  .max(8);

const NewAssignment = z.object({
  title: z.string().trim().min(1).max(100),
  skill: z.enum(SKILL_IDS).nullable().optional(),
  prompt: z.string().trim().min(5).max(2000),
  rubric: Rubric,
  dueDate: z.iso.date().nullable().optional(),
});

function ownAssignment(classId: number, id: number) {
  return db.prepare("SELECT * FROM assignments WHERE id = ? AND class_id = ?").get(id, classId) as AssignmentRow | undefined;
}

function submissionView(s: SubmissionRow & { student_name?: string }) {
  return {
    id: s.id,
    studentId: s.student_id,
    studentName: s.student_name,
    answerText: s.answer_text,
    image: s.image ? `/api/images/${s.image}` : null,
    status: s.status,
    ai: s.ai_json ? JSON.parse(s.ai_json) : null,
    aiScore: s.ai_score,
    aiConfidence: s.ai_confidence,
    finalScore: s.final_score,
    final: s.final_json ? JSON.parse(s.final_json) : null,
    teacherNote: s.teacher_note,
    submittedAt: s.submitted_at,
    gradedAt: s.graded_at,
    approvedAt: s.approved_at,
  };
}

export async function assessmentRoutes(app: FastifyInstance) {
  // ── Teacher ──
  app.get("/api/teacher/assignments", { preHandler: requireTeacher }, async (req) => {
    const classId = req.user!.class_id!;
    const size = (db.prepare("SELECT COUNT(*) AS n FROM users WHERE class_id = ? AND role = 'student'").get(classId) as { n: number }).n;
    const rows = db
      .prepare(
        `SELECT a.*,
           SUM(CASE WHEN s.status = 'submitted' THEN 1 ELSE 0 END) AS n_submitted,
           SUM(CASE WHEN s.status = 'ai_graded' THEN 1 ELSE 0 END) AS n_ai,
           SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) AS n_approved,
           AVG(s.final_score) AS avg_final
         FROM assignments a LEFT JOIN submissions s ON s.assignment_id = a.id
         WHERE a.class_id = ? GROUP BY a.id ORDER BY a.created_at DESC`,
      )
      .all(classId) as (AssignmentRow & { n_submitted: number; n_ai: number; n_approved: number; avg_final: number | null })[];
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      skill: a.skill,
      prompt: a.prompt,
      maxScore: a.max_score,
      dueDate: a.due_date,
      createdAt: a.created_at,
      classSize: size,
      counts: { submitted: a.n_submitted ?? 0, aiGraded: a.n_ai ?? 0, approved: a.n_approved ?? 0 },
      avgFinal: a.avg_final,
    }));
  });

  app.post("/api/teacher/assignments", { preHandler: requireTeacher }, async (req, reply) => {
    const body = NewAssignment.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Please check the assignment details." });
    const { title, skill, prompt, rubric, dueDate } = body.data;
    const max = rubric.reduce((s, r) => s + r.max, 0);
    const info = db
      .prepare(
        "INSERT INTO assignments (class_id, teacher_id, title, skill, prompt, rubric_json, max_score, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(req.user!.class_id, req.user!.id, title, skill ?? null, prompt, JSON.stringify(rubric), max, dueDate ?? null);
    return { id: Number(info.lastInsertRowid) };
  });

  app.delete("/api/teacher/assignments/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const info = db.prepare("DELETE FROM assignments WHERE id = ? AND class_id = ?").run(id, req.user!.class_id);
    if (!info.changes) return reply.code(404).send({ error: "Assignment not found." });
    return { ok: true };
  });

  app.get("/api/teacher/assignments/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const a = ownAssignment(req.user!.class_id!, id);
    if (!a) return reply.code(404).send({ error: "Assignment not found." });
    const subs = db
      .prepare(
        `SELECT s.*, u.name AS student_name FROM submissions s JOIN users u ON u.id = s.student_id
         WHERE s.assignment_id = ? ORDER BY CASE s.status WHEN 'ai_graded' THEN 0 WHEN 'submitted' THEN 1 ELSE 2 END, u.name`,
      )
      .all(id) as (SubmissionRow & { student_name: string })[];
    const missing = db
      .prepare(
        `SELECT id, name FROM users WHERE class_id = ? AND role = 'student'
         AND id NOT IN (SELECT student_id FROM submissions WHERE assignment_id = ?) ORDER BY name`,
      )
      .all(req.user!.class_id, id);
    return {
      assignment: { id: a.id, title: a.title, skill: a.skill, prompt: a.prompt, rubric: JSON.parse(a.rubric_json) as RubricItem[], maxScore: a.max_score, dueDate: a.due_date },
      submissions: subs.map(submissionView),
      missing,
    };
  });

  // AI drafts a grade. Nothing is shown to the student until the teacher approves.
  app.post(
    "/api/teacher/submissions/:id/grade",
    { preHandler: requireTeacher, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
      const s = db
        .prepare(
          `SELECT s.*, a.prompt, a.rubric_json, u.lang AS student_lang FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id JOIN users u ON u.id = s.student_id
           WHERE s.id = ? AND a.class_id = ?`,
        )
        .get(id, req.user!.class_id) as (SubmissionRow & { prompt: string; rubric_json: string; student_lang: Lang }) | undefined;
      if (!s) return reply.code(404).send({ error: "Submission not found." });
      if (s.status === "approved") return reply.code(409).send({ error: "This grade has already been approved." });
      const img = s.image ? readImage(s.image) : null;
      try {
        const result = await gradeAnswer({
          prompt: s.prompt,
          rubric: JSON.parse(s.rubric_json) as RubricItem[],
          answerText: s.answer_text,
          imageBase64: img ? img.toString("base64") : null,
          studentLang: s.student_lang,
          teacherLang: req.user!.lang,
        });
        db.prepare(
          "UPDATE submissions SET status = 'ai_graded', ai_json = ?, ai_score = ?, ai_confidence = ?, graded_at = datetime('now') WHERE id = ?",
        ).run(JSON.stringify(result), result.total, result.confidence, id);
        const row = db
          .prepare("SELECT s.*, u.name AS student_name FROM submissions s JOIN users u ON u.id = s.student_id WHERE s.id = ?")
          .get(id) as SubmissionRow & { student_name: string };
        return submissionView(row);
      } catch (err) {
        const e = err instanceof AiError ? err : new AiError(500, "Something went wrong while grading.");
        if (e.status >= 500) req.log.error({ err }, "grading failed");
        return reply.code(e.status).send({ error: e.message });
      }
    },
  );

  // Human in the loop: the teacher confirms or overrides each criterion, then releases the result.
  app.post("/api/teacher/submissions/:id/approve", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const body = z
      .object({
        scores: z.array(z.number().min(0).max(20)).min(1).max(8),
        feedback: z.string().trim().max(1200).optional(),
        note: z.string().trim().max(600).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Please give a score for every criterion." });
    const s = db
      .prepare(
        `SELECT s.*, a.rubric_json FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ? AND a.class_id = ?`,
      )
      .get(id, req.user!.class_id) as (SubmissionRow & { rubric_json: string }) | undefined;
    if (!s) return reply.code(404).send({ error: "Submission not found." });
    const rubric = JSON.parse(s.rubric_json) as RubricItem[];
    if (body.data.scores.length !== rubric.length) return reply.code(400).send({ error: "Please give a score for every criterion." });
    const ai = s.ai_json ? (JSON.parse(s.ai_json) as { criteria: { feedback: string }[]; overall_feedback: string }) : null;
    const criteria = rubric.map((r, i) => ({
      criterion: r.criterion,
      max: r.max,
      score: Math.round(Math.min(r.max, body.data.scores[i]) * 2) / 2,
      feedback: ai?.criteria[i]?.feedback ?? "",
    }));
    const total = criteria.reduce((sum, c) => sum + c.score, 0);
    const final = { criteria, feedback: body.data.feedback ?? ai?.overall_feedback ?? "", overriddenFromAi: ai ? total !== s.ai_score : null };
    const wasApproved = s.status === "approved";
    db.prepare(
      "UPDATE submissions SET status = 'approved', final_score = ?, final_json = ?, teacher_note = ?, approved_at = datetime('now') WHERE id = ?",
    ).run(total, JSON.stringify(final), body.data.note ?? null, id);
    if (!wasApproved) addXp(s.student_id, 20, "assignment_graded");
    return { ok: true, total };
  });

  // ── Student ──
  app.get("/api/student/assignments", { preHandler: requireStudent }, async (req) => {
    const u = req.user!;
    if (!u.class_id) return [];
    const rows = db
      .prepare(
        `SELECT a.*, s.id AS sub_id, s.status, s.answer_text, s.image, s.final_score, s.final_json, s.submitted_at, s.approved_at
         FROM assignments a LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
         WHERE a.class_id = ? ORDER BY a.created_at DESC`,
      )
      .all(u.id, u.class_id) as (AssignmentRow & {
      sub_id: number | null;
      status: string | null;
      answer_text: string | null;
      image: string | null;
      final_score: number | null;
      final_json: string | null;
      submitted_at: string | null;
      approved_at: string | null;
    })[];
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      skill: a.skill,
      prompt: a.prompt,
      rubric: JSON.parse(a.rubric_json) as RubricItem[],
      maxScore: a.max_score,
      dueDate: a.due_date,
      overdue: Boolean(a.due_date && a.due_date < todayMY()),
      submission: a.sub_id
        ? {
            // AI drafts stay hidden: the student only sees "waiting for your teacher" until approval.
            status: a.status === "approved" ? "returned" : "submitted",
            answerText: a.answer_text,
            image: a.image ? `/api/images/${a.image}` : null,
            submittedAt: a.submitted_at,
            result: a.status === "approved" ? { score: a.final_score, ...(a.final_json ? JSON.parse(a.final_json) : {}) } : null,
          }
        : null,
    }));
  });

  app.post(
    "/api/student/assignments/:id/submit",
    { preHandler: requireStudent, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
      const u = req.user!;
      const a = u.class_id ? ownAssignment(u.class_id, id) : undefined;
      if (!a) return reply.code(404).send({ error: "Assignment not found." });
      const existing = db.prepare("SELECT status FROM submissions WHERE assignment_id = ? AND student_id = ?").get(id, u.id) as
        | { status: string }
        | undefined;
      if (existing?.status === "approved") return reply.code(409).send({ error: "Your teacher has already marked this one." });

      let answer = "";
      let image: { name: string } | null = null;
      try {
        if (req.isMultipart()) {
          for await (const part of req.parts()) {
            if (part.type === "file") {
              if (image) await part.toBuffer();
              else image = await saveImage(part);
            } else if (part.fieldname === "answer" && typeof part.value === "string") {
              answer = part.value;
            }
          }
        } else {
          answer = String((req.body as { answer?: unknown })?.answer ?? "");
        }
      } catch (err) {
        if (err instanceof UploadError) return reply.code(err.status).send({ error: err.message });
        throw err;
      }
      answer = answer.trim().slice(0, 4000);
      if (!answer && !image) return reply.code(400).send({ error: "Type your answer or add a photo of your working." });
      db.prepare(
        `INSERT INTO submissions (assignment_id, student_id, answer_text, image, status) VALUES (?, ?, ?, ?, 'submitted')
         ON CONFLICT(assignment_id, student_id) DO UPDATE SET answer_text = excluded.answer_text, image = COALESCE(excluded.image, image),
           status = 'submitted', ai_json = NULL, ai_score = NULL, ai_confidence = NULL, graded_at = NULL, submitted_at = datetime('now')`,
      ).run(id, u.id, answer || null, image?.name ?? null);
      if (!existing) addXp(u.id, 15, "assignment_submitted");
      return { ok: true };
    },
  );
}
