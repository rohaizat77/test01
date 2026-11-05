// Database-backed wrapper around the adaptive engine: question bank, mastery state, answering, XP.
import { db, todayMY } from "./db.js";
import { STARTER_BANK, type Choice } from "./content/bank.js";
import { MISCONCEPTIONS, SKILL_BY_ID, type Lang } from "./content/curriculum.js";
import {
  BKT,
  bktUpdate,
  isMastered,
  checkAnswer,
  eloUpdate,
  pickQuestion,
  rankSkills,
  type QuestionLite,
  type SkillState,
} from "./ml/engine.js";

export interface QuestionRow {
  id: number;
  slug: string | null;
  skill: string;
  kind: "mcq" | "num";
  difficulty: number;
  stem_en: string;
  stem_ms: string;
  choices_json: string | null;
  answer: string;
  explanation_en: string;
  explanation_ms: string;
  source: "seed" | "ai";
  n_attempts: number;
  n_correct: number;
}

// Load the starter bank. Text is refreshed from code on every start; learned difficulty is kept.
export function ensureBank() {
  const upsert = db.prepare(`
    INSERT INTO questions (slug, skill, kind, difficulty, stem_en, stem_ms, choices_json, answer, explanation_en, explanation_ms, source)
    VALUES (@slug, @skill, @kind, @difficulty, @stem_en, @stem_ms, @choices_json, @answer, @explanation_en, @explanation_ms, 'seed')
    ON CONFLICT(slug) DO UPDATE SET skill = excluded.skill, kind = excluded.kind, stem_en = excluded.stem_en, stem_ms = excluded.stem_ms,
      choices_json = excluded.choices_json, answer = excluded.answer, explanation_en = excluded.explanation_en, explanation_ms = excluded.explanation_ms`);
  db.transaction(() => {
    for (const q of STARTER_BANK) upsert.run({ ...q, choices_json: q.choices ? JSON.stringify(q.choices) : null });
  })();
}

export function getQuestion(id: number) {
  return db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as QuestionRow | undefined;
}

export function publicQuestion(q: QuestionRow, lang: Lang) {
  const choices = q.choices_json ? (JSON.parse(q.choices_json) as Choice[]).map((c) => c[lang]) : null;
  return {
    id: q.id,
    skill: q.skill,
    kind: q.kind,
    stem: lang === "ms" ? q.stem_ms : q.stem_en,
    choices,
    source: q.source,
    difficulty: Math.round(q.difficulty * 100) / 100,
  };
}

export function skillStates(userId: number): Map<string, SkillState> {
  const rows = db
    .prepare("SELECT skill, p_known, theta, n, n_correct, last_at FROM mastery WHERE user_id = ?")
    .all(userId) as { skill: string; p_known: number; theta: number; n: number; n_correct: number; last_at: string | null }[];
  const recent = db
    .prepare(
      `SELECT skill, correct FROM (
         SELECT skill, correct, ROW_NUMBER() OVER (PARTITION BY skill ORDER BY id DESC) AS rn FROM attempts WHERE user_id = ?
       ) WHERE rn <= 5`,
    )
    .all(userId) as { skill: string; correct: number }[];
  const wrong = new Map<string, number>();
  for (const r of recent) if (!r.correct) wrong.set(r.skill, (wrong.get(r.skill) ?? 0) + 1);
  const now = Date.now();
  const map = new Map<string, SkillState>();
  for (const r of rows) {
    map.set(r.skill, {
      skill: r.skill,
      pKnown: r.p_known,
      theta: r.theta,
      n: r.n,
      nCorrect: r.n_correct,
      daysSince: r.last_at ? Math.floor((now - new Date(`${r.last_at.replace(" ", "T")}Z`).getTime()) / 86400_000) : null,
      recentWrong: wrong.get(r.skill) ?? 0,
    });
  }
  return map;
}

export function learningPath(userId: number, subject?: string, limit = 3) {
  return rankSkills(skillStates(userId), subject).slice(0, limit);
}

export function nextQuestion(userId: number, opts: { skill?: string; subject?: string; exclude?: number[] }) {
  const states = skillStates(userId);
  const skill = opts.skill ?? rankSkills(states, opts.subject)[0]?.skill;
  if (!skill || !SKILL_BY_ID.has(skill)) return null;
  const candidates = db
    .prepare("SELECT id, skill, kind, difficulty FROM questions WHERE skill = ? AND status = 'active'")
    .all(skill) as QuestionLite[];
  const recentIds = new Set(
    (db.prepare("SELECT question_id FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT 25").all(userId) as { question_id: number }[]).map(
      (r) => r.question_id,
    ),
  );
  for (const id of opts.exclude ?? []) recentIds.add(id);
  const theta = states.get(skill)?.theta ?? 0;
  const picked = pickQuestion(candidates, theta, recentIds);
  return picked ? getQuestion(picked.id) ?? null : null;
}

export function addXp(userId: number, amount: number, reason: string, day = todayMY()) {
  if (amount <= 0) return;
  db.prepare("INSERT INTO xp_events (user_id, amount, reason, day) VALUES (?, ?, ?, ?)").run(userId, amount, reason, day);
}

export function recordAnswer(userId: number, q: QuestionRow, response: string, session: string | null) {
  const correct = checkAnswer(q.kind, q.answer, response);
  let misconception: string | null = null;
  if (!correct && q.kind === "mcq" && q.choices_json) {
    const choice = (JSON.parse(q.choices_json) as Choice[])[Number(response)];
    misconception = choice?.m ?? null;
  }
  const state = db.prepare("SELECT p_known, theta, n, n_correct FROM mastery WHERE user_id = ? AND skill = ?").get(userId, q.skill) as
    | { p_known: number; theta: number; n: number; n_correct: number }
    | undefined;
  const pBefore = state?.p_known ?? BKT.pInit;
  const pAfter = bktUpdate(pBefore, correct, q.kind);
  const elo = eloUpdate(state?.theta ?? 0, q.difficulty, correct, state?.n ?? 0, q.n_attempts);

  const xp = correct ? 10 : 3;
  const nBefore = state?.n ?? 0;
  const crossedMastery = !isMastered(pBefore, nBefore) && isMastered(pAfter, nBefore + 1);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO mastery (user_id, skill, p_known, theta, n, n_correct, last_at) VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
       ON CONFLICT(user_id, skill) DO UPDATE SET p_known = excluded.p_known, theta = excluded.theta, n = n + 1,
         n_correct = n_correct + excluded.n_correct, last_at = excluded.last_at`,
    ).run(userId, q.skill, pAfter, elo.theta, correct ? 1 : 0);
    db.prepare("UPDATE questions SET difficulty = ?, n_attempts = n_attempts + 1, n_correct = n_correct + ? WHERE id = ?").run(
      elo.difficulty,
      correct ? 1 : 0,
      q.id,
    );
    db.prepare(
      `INSERT INTO attempts (user_id, question_id, skill, correct, response, misconception, p_before, p_after, session)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, q.id, q.skill, correct ? 1 : 0, response.slice(0, 40), misconception, pBefore, pAfter, session);
    addXp(userId, xp, correct ? "correct" : "attempt");
    if (crossedMastery) addXp(userId, 50, "mastered");
  })();

  return {
    correct,
    answer: q.answer,
    misconception,
    pBefore,
    pAfter,
    expected: elo.expected,
    xp: xp + (crossedMastery ? 50 : 0),
    crossedMastery,
  };
}

export function misconceptionLabel(id: string | null, lang: Lang) {
  return id && MISCONCEPTIONS[id] ? MISCONCEPTIONS[id].label[lang] : null;
}
