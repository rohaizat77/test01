import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";
import { langOf, requireTeacher } from "../auth.js";
import { MISCONCEPTIONS, SKILL_BY_ID, SKILL_IDS } from "../content/curriculum.js";
import { AiError } from "../ai/client.js";
import { DIFFICULTY_LOGIT, LessonPlan, generateQuestions, lessonPlan, validateGenerated } from "../ai/teacher.js";
import { classOverview } from "../insights.js";

function aiFail(err: unknown, fallback: string) {
  return err instanceof AiError ? err : new AiError(500, fallback);
}

export async function plannerRoutes(app: FastifyInstance) {
  const aiLimit = { rateLimit: { max: 6, timeWindow: "1 minute" } };

  // ── Lesson plans ──
  app.get("/api/teacher/plans", { preHandler: requireTeacher }, async (req) => {
    return db
      .prepare("SELECT id, skill, title, params_json, created_at, updated_at FROM lesson_plans WHERE teacher_id = ? ORDER BY updated_at DESC")
      .all(req.user!.id)
      .map((r) => {
        const row = r as { id: number; skill: string; title: string; params_json: string; created_at: string; updated_at: string };
        return { id: row.id, skill: row.skill, title: row.title, params: JSON.parse(row.params_json), createdAt: row.created_at, updatedAt: row.updated_at };
      });
  });

  app.get("/api/teacher/plans/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const row = db.prepare("SELECT * FROM lesson_plans WHERE id = ? AND teacher_id = ?").get(id, req.user!.id) as
      | { id: number; skill: string; title: string; params_json: string; plan_json: string; updated_at: string }
      | undefined;
    if (!row) return reply.code(404).send({ error: "Lesson plan not found." });
    return { id: row.id, skill: row.skill, params: JSON.parse(row.params_json), plan: JSON.parse(row.plan_json), updatedAt: row.updated_at };
  });

  app.post("/api/teacher/plans", { preHandler: requireTeacher, config: aiLimit }, async (req, reply) => {
    const body = z
      .object({
        skill: z.enum(SKILL_IDS),
        minutes: z.number().int().min(30).max(120),
        lang: z.enum(["en", "ms"]).optional(),
        notes: z.string().trim().max(400).optional(),
        useClassData: z.boolean().default(true),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Choose a topic and a lesson length between 30 and 120 minutes." });
    const { skill, minutes, notes, useClassData } = body.data;
    const lang = body.data.lang ?? langOf(req);
    let classData;
    if (useClassData) {
      const o = classOverview(req.user!.class_id!);
      const s = o.skills.find((x) => x.skill === skill);
      classData = {
        avg: s?.avg ?? null,
        struggling: s?.struggling.length ?? 0,
        mastered: s?.mastered ?? 0,
        total: o.totals.students,
        misconceptions: o.misconceptions.filter((m) => m.skill === skill).map((m) => `${m.label.en} (${m.students.length} students)`),
      };
    }
    try {
      const plan = await lessonPlan({ skill, minutes, lang, notes, classData });
      const params = { skill, minutes, lang, notes: notes ?? null, useClassData };
      const info = db
        .prepare("INSERT INTO lesson_plans (teacher_id, skill, title, params_json, plan_json) VALUES (?, ?, ?, ?, ?)")
        .run(req.user!.id, skill, plan.title.slice(0, 200), JSON.stringify(params), JSON.stringify(plan));
      return { id: Number(info.lastInsertRowid), skill, params, plan };
    } catch (err) {
      const e = aiFail(err, "Something went wrong while writing the lesson plan.");
      if (e.status >= 500) req.log.error({ err }, "planner failed");
      return reply.code(e.status).send({ error: e.message });
    }
  });

  // Teachers edit the plan; the edited version is validated against the same schema the AI used.
  app.put("/api/teacher/plans/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const body = z.object({ plan: LessonPlan }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "The lesson plan has missing or invalid fields." });
    const json = JSON.stringify(body.data.plan);
    if (json.length > 60_000) return reply.code(413).send({ error: "That lesson plan is too long." });
    const info = db
      .prepare("UPDATE lesson_plans SET plan_json = ?, title = ?, updated_at = datetime('now') WHERE id = ? AND teacher_id = ?")
      .run(json, body.data.plan.title.slice(0, 200), id, req.user!.id);
    if (!info.changes) return reply.code(404).send({ error: "Lesson plan not found." });
    return { ok: true };
  });

  app.delete("/api/teacher/plans/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const info = db.prepare("DELETE FROM lesson_plans WHERE id = ? AND teacher_id = ?").run(id, req.user!.id);
    if (!info.changes) return reply.code(404).send({ error: "Lesson plan not found." });
    return { ok: true };
  });

  // ── Worksheets & question bank ──
  app.post("/api/teacher/worksheet", { preHandler: requireTeacher, config: aiLimit }, async (req, reply) => {
    const body = z
      .object({ skill: z.enum(SKILL_IDS), count: z.number().int().min(3).max(10), mix: z.enum(["easy", "mixed", "hard"]), notes: z.string().trim().max(300).optional() })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Choose a topic and between 3 and 10 questions." });
    try {
      const questions = await generateQuestions(body.data.skill, body.data.count, body.data.mix, body.data.notes);
      if (!questions.length) return reply.code(502).send({ error: "The AI's questions didn't pass our checks. Please try again." });
      return { skill: body.data.skill, questions };
    } catch (err) {
      const e = aiFail(err, "Something went wrong while writing questions.");
      if (e.status >= 500) req.log.error({ err }, "worksheet failed");
      return reply.code(e.status).send({ error: e.message });
    }
  });

  // Teacher-approved AI questions join the adaptive bank (human review before students see them).
  app.post("/api/teacher/questions", { preHandler: requireTeacher }, async (req, reply) => {
    const Q = z.object({
      skill: z.enum(SKILL_IDS),
      stem_en: z.string().trim().min(3).max(600),
      stem_ms: z.string().trim().min(3).max(600),
      choices: z.array(z.object({ en: z.string().trim().min(1).max(200), ms: z.string().trim().min(1).max(200), m: z.string().max(40).optional() })).length(4),
      answer: z.number().int().min(0).max(3),
      explanation_en: z.string().trim().min(1).max(600),
      explanation_ms: z.string().trim().min(1).max(600),
      difficulty: z.enum(["easy", "medium", "hard"]),
    });
    const body = z.object({ questions: z.array(Q).min(1).max(10) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Some questions are incomplete." });
    const checked = validateGenerated(
      body.data.questions[0].skill,
      body.data.questions.map((q) => ({
        stem_en: q.stem_en,
        stem_ms: q.stem_ms,
        choices: q.choices.map((c) => ({ en: c.en, ms: c.ms })),
        correct_index: q.answer,
        explanation_en: q.explanation_en,
        explanation_ms: q.explanation_ms,
        difficulty: q.difficulty,
        distractor_misconceptions: q.choices.map((c) => (c.m && MISCONCEPTIONS[c.m] ? c.m : null)),
      })),
    );
    if (body.data.questions.some((q) => q.skill !== body.data.questions[0].skill) || checked.length !== body.data.questions.length) {
      return reply.code(400).send({ error: "Each question needs 4 different options and one correct answer." });
    }
    const ins = db.prepare(
      `INSERT INTO questions (skill, kind, difficulty, stem_en, stem_ms, choices_json, answer, explanation_en, explanation_ms, source, created_by)
       VALUES (?, 'mcq', ?, ?, ?, ?, ?, ?, ?, 'ai', ?)`,
    );
    const ids = db.transaction(() =>
      checked.map((q) =>
        Number(
          ins.run(q.skill, DIFFICULTY_LOGIT[q.difficulty], q.stem_en, q.stem_ms, JSON.stringify(q.choices), String(q.answer), q.explanation_en, q.explanation_ms, req.user!.id)
            .lastInsertRowid,
        ),
      ),
    )();
    return { added: ids.length, ids };
  });

  app.get("/api/teacher/bank", { preHandler: requireTeacher }, async (req) => {
    const q = z.object({ skill: z.enum(SKILL_IDS) }).parse(req.query);
    const lang = langOf(req);
    return (
      db
        .prepare(
          "SELECT id, kind, difficulty, stem_en, stem_ms, choices_json, answer, source, n_attempts, n_correct FROM questions WHERE skill = ? AND status = 'active' ORDER BY difficulty",
        )
        .all(q.skill) as { id: number; kind: string; difficulty: number; stem_en: string; stem_ms: string; choices_json: string | null; answer: string; source: string; n_attempts: number; n_correct: number }[]
    ).map((r) => ({
      id: r.id,
      kind: r.kind,
      difficulty: Math.round(r.difficulty * 100) / 100,
      stem: lang === "ms" ? r.stem_ms : r.stem_en,
      choices: r.choices_json ? (JSON.parse(r.choices_json) as { en: string; ms: string }[]).map((c) => c[lang]) : null,
      answer: r.answer,
      source: r.source,
      attempts: r.n_attempts,
      pctCorrect: r.n_attempts ? Math.round((r.n_correct / r.n_attempts) * 100) : null,
    }));
  });

  app.get("/api/skills/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().max(20) }).parse(req.params);
    const s = SKILL_BY_ID.get(id);
    if (!s) return reply.code(404).send({ error: "Not found." });
    return s;
  });
}
