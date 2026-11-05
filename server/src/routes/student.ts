import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";
import { langOf, requireStudent, requireUser } from "../auth.js";
import { SKILL_IDS } from "../content/curriculum.js";
import type { Choice } from "../content/bank.js";
import { getQuestion, learningPath, misconceptionLabel, nextQuestion, publicQuestion, recordAnswer } from "../learning.js";
import { badges, classLeaderboard, masteryHistory, masteryList, quizHistory, xpSummary } from "../stats.js";

export async function studentRoutes(app: FastifyInstance) {
  app.get("/api/student/home", { preHandler: requireStudent }, async (req) => {
    const u = req.user!;
    const board = u.class_id ? classLeaderboard(u.class_id, u.id) : [];
    const pending = u.class_id
      ? (
          db
            .prepare(
              `SELECT COUNT(*) AS n FROM assignments a WHERE a.class_id = ?
               AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = ?)`,
            )
            .get(u.class_id, u.id) as { n: number }
        ).n
      : 0;
    return {
      name: u.name,
      className: u.class_name,
      dailyGoal: u.daily_goal,
      xp: xpSummary(u.id),
      path: learningPath(u.id),
      mastery: masteryList(u.id),
      badges: badges(u.id),
      rank: board.find((b) => b.isYou)?.rank ?? null,
      classSize: board.length,
      pendingAssignments: pending,
    };
  });

  app.get("/api/student/path", { preHandler: requireStudent }, async (req) => {
    const q = z.object({ subject: z.enum(["math", "sci"]).optional() }).parse(req.query);
    return learningPath(req.user!.id, q.subject, 3);
  });

  app.get("/api/student/progress", { preHandler: requireStudent }, async (req) => {
    const id = req.user!.id;
    return { mastery: masteryList(id), history: masteryHistory(id), quizzes: quizHistory(id), xp: xpSummary(id), badges: badges(id) };
  });

  app.get("/api/class/leaderboard", { preHandler: requireUser }, async (req) => {
    const u = req.user!;
    if (!u.class_id) return [];
    return classLeaderboard(u.class_id, u.id);
  });

  app.get("/api/quiz/next", { preHandler: requireStudent }, async (req, reply) => {
    const q = z
      .object({
        skill: z.enum(SKILL_IDS).optional(),
        subject: z.enum(["math", "sci"]).optional(),
        exclude: z.string().max(200).optional(),
      })
      .parse(req.query);
    const exclude = (q.exclude ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const question = nextQuestion(req.user!.id, { skill: q.skill, subject: q.subject, exclude });
    if (!question) return reply.code(404).send({ error: "No questions available for this topic yet." });
    return publicQuestion(question, langOf(req));
  });

  app.post("/api/quiz/answer", { preHandler: requireStudent, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = z
      .object({
        questionId: z.number().int().positive(),
        response: z.string().trim().min(1).max(40),
        session: z.string().regex(/^[a-z0-9-]{6,40}$/).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Please choose or type an answer." });
    const q = getQuestion(body.data.questionId);
    if (!q) return reply.code(404).send({ error: "Question not found." });
    const lang = langOf(req);
    const r = recordAnswer(req.user!.id, q, body.data.response, body.data.session ?? null);
    const choices = q.choices_json ? (JSON.parse(q.choices_json) as Choice[]) : null;
    return {
      correct: r.correct,
      correctAnswer: choices ? choices[Number(q.answer)][lang] : q.answer,
      correctIndex: choices ? Number(q.answer) : null,
      explanation: lang === "ms" ? q.explanation_ms : q.explanation_en,
      misconception: misconceptionLabel(r.misconception, lang),
      pBefore: r.pBefore,
      pAfter: r.pAfter,
      xp: r.xp,
      mastered: r.crossedMastery,
    };
  });
}
