import type { FastifyInstance } from "fastify";
import { MISCONCEPTIONS, SKILLS, SUBJECTS } from "../content/curriculum.js";
import { BKT, TARGET_SUCCESS } from "../ml/engine.js";
import { db } from "../db.js";

export async function contentRoutes(app: FastifyInstance) {
  // Public: the curriculum map and model parameters (used by the app and the methodology page).
  app.get("/api/curriculum", async () => {
    const counts = new Map(
      (db.prepare("SELECT skill, COUNT(*) AS n FROM questions WHERE status = 'active' GROUP BY skill").all() as { skill: string; n: number }[]).map(
        (r) => [r.skill, r.n],
      ),
    );
    return {
      subjects: SUBJECTS,
      skills: SKILLS.map((s) => ({ ...s, questions: counts.get(s.id) ?? 0 })),
      misconceptions: Object.fromEntries(Object.entries(MISCONCEPTIONS).map(([k, v]) => [k, v])),
      model: { ...BKT, targetSuccess: TARGET_SUCCESS },
    };
  });
}
