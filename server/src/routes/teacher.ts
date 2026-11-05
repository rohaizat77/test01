import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, toMYDate } from "../db.js";
import { langOf, requireTeacher } from "../auth.js";
import { classOverview } from "../insights.js";
import { classSummary } from "../ai/teacher.js";
import { AiError } from "../ai/client.js";
import { badges, masteryHistory, masteryList, xpSummary } from "../stats.js";
import { misconceptionLabel } from "../learning.js";

export async function teacherRoutes(app: FastifyInstance) {
  app.get("/api/teacher/overview", { preHandler: requireTeacher }, async (req) => {
    const u = req.user!;
    const cls = db.prepare("SELECT name, join_code, kind FROM classes WHERE id = ?").get(u.class_id) as { name: string; join_code: string; kind: string };
    return { className: cls.name, joinCode: cls.kind === "real" ? cls.join_code : null, ...classOverview(u.class_id!) };
  });

  app.get("/api/teacher/students/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const s = db.prepare("SELECT id, name FROM users WHERE id = ? AND class_id = ? AND role = 'student'").get(id, req.user!.class_id) as
      | { id: number; name: string }
      | undefined;
    if (!s) return reply.code(404).send({ error: "Student not found." });
    const lang = langOf(req);
    const recent = (
      db
        .prepare(
          `SELECT a.id, a.skill, a.correct, a.misconception, a.p_after, a.created_at, q.stem_en, q.stem_ms
           FROM attempts a JOIN questions q ON q.id = a.question_id WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 15`,
        )
        .all(id) as { id: number; skill: string; correct: number; misconception: string | null; p_after: number; created_at: string; stem_en: string; stem_ms: string }[]
    ).map((r) => ({
      id: r.id,
      skill: r.skill,
      correct: Boolean(r.correct),
      misconception: misconceptionLabel(r.misconception, lang),
      pAfter: r.p_after,
      date: toMYDate(r.created_at),
      stem: lang === "ms" ? r.stem_ms : r.stem_en,
    }));
    const mis = (
      db
        .prepare(
          "SELECT misconception, COUNT(*) AS n FROM attempts WHERE user_id = ? AND misconception IS NOT NULL GROUP BY misconception ORDER BY n DESC LIMIT 5",
        )
        .all(id) as { misconception: string; n: number }[]
    ).map((m) => ({ label: misconceptionLabel(m.misconception, lang), count: m.n }));
    // Privacy by design: teachers see how much a student used the tutor per topic, not the conversation itself.
    const tutorUse = db
      .prepare("SELECT skill, COUNT(*) AS n FROM tutor_messages WHERE user_id = ? AND role = 'user' GROUP BY skill")
      .all(id) as { skill: string | null; n: number }[];
    return {
      student: s,
      mastery: masteryList(id),
      history: masteryHistory(id, 42),
      xp: xpSummary(id),
      badges: badges(id),
      recent,
      misconceptions: mis,
      tutorUse,
    };
  });

  app.get("/api/teacher/summary", { preHandler: requireTeacher }, async (req) => {
    const row = db
      .prepare("SELECT json, created_at FROM class_summaries WHERE class_id = ? AND lang = ? ORDER BY id DESC LIMIT 1")
      .get(req.user!.class_id, langOf(req)) as { json: string; created_at: string } | undefined;
    return row ? { summary: JSON.parse(row.json), createdAt: row.created_at } : { summary: null, createdAt: null };
  });

  app.post(
    "/api/teacher/summary",
    { preHandler: requireTeacher, config: { rateLimit: { max: 4, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const lang = langOf(req);
      try {
        const summary = await classSummary(classOverview(req.user!.class_id!), lang);
        db.prepare("INSERT INTO class_summaries (class_id, lang, json) VALUES (?, ?, ?)").run(req.user!.class_id, lang, JSON.stringify(summary));
        return { summary, createdAt: new Date().toISOString() };
      } catch (err) {
        const e = err instanceof AiError ? err : new AiError(500, "Something went wrong while writing the summary.");
        if (e.status >= 500) req.log.error({ err }, "summary failed");
        return reply.code(e.status).send({ error: e.message });
      }
    },
  );
}
