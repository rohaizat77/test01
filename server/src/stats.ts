// Engagement and progress statistics: XP, streaks, badges, leaderboards, mastery history.
import { db, todayMY, addDays, toMYDate } from "./db.js";
import { SKILLS } from "./content/curriculum.js";
import { BKT, masteryLevel } from "./ml/engine.js";

export function xpSummary(userId: number) {
  const today = todayMY();
  const rows = db.prepare("SELECT day, SUM(amount) AS xp FROM xp_events WHERE user_id = ? GROUP BY day ORDER BY day DESC").all(userId) as {
    day: string;
    xp: number;
  }[];
  const byDay = new Map(rows.map((r) => [r.day, r.xp]));
  const total = rows.reduce((s, r) => s + r.xp, 0);
  let week = 0;
  for (let i = 0; i < 7; i++) week += byDay.get(addDays(today, -i)) ?? 0;
  // Streak counts back from today, or from yesterday if today has no practice yet.
  let streak = 0;
  let cursor = byDay.has(today) ? today : addDays(today, -1);
  while (byDay.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(today, -13 + i);
    return { day, xp: byDay.get(day) ?? 0 };
  });
  return { total, today: byDay.get(today) ?? 0, week, streak, last14 };
}

export function masteryList(userId: number) {
  const rows = db.prepare("SELECT skill, p_known, theta, n, n_correct, last_at FROM mastery WHERE user_id = ?").all(userId) as {
    skill: string;
    p_known: number;
    theta: number;
    n: number;
    n_correct: number;
    last_at: string | null;
  }[];
  const map = new Map(rows.map((r) => [r.skill, r]));
  return SKILLS.map((s) => {
    const r = map.get(s.id);
    const p = r?.p_known ?? BKT.pInit;
    return {
      skill: s.id,
      subject: s.subject,
      pKnown: Math.round(p * 1000) / 1000,
      level: masteryLevel(p, r?.n ?? 0),
      attempts: r?.n ?? 0,
      accuracy: r && r.n ? Math.round((r.n_correct / r.n) * 100) : null,
      lastPractised: r?.last_at ? toMYDate(r.last_at) : null,
    };
  });
}

export const BADGES = [
  "first_steps",
  "streak_3",
  "streak_7",
  "first_mastery",
  "gap_bridger",
  "perfect_five",
  "curious_mind",
  "all_rounder",
] as const;

export function badges(userId: number) {
  const xp = xpSummary(userId);
  const attempts = (db.prepare("SELECT COUNT(*) AS n FROM attempts WHERE user_id = ?").get(userId) as { n: number }).n;
  const mastered = (db.prepare("SELECT COUNT(*) AS n FROM mastery WHERE user_id = ? AND p_known >= ? AND n >= ?").get(userId, BKT.masteredAt, BKT.minAttemptsForMastery) as { n: number }).n;
  const skillsTried = (db.prepare("SELECT COUNT(*) AS n FROM mastery WHERE user_id = ? AND n > 0").get(userId) as { n: number }).n;
  const bridged = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM mastery m WHERE m.user_id = ? AND m.p_known >= ? AND m.n >= ?
         AND EXISTS (SELECT 1 FROM attempts a WHERE a.user_id = m.user_id AND a.skill = m.skill AND a.p_before < 0.4 AND a.created_at > datetime('now','-90 days'))`,
      )
      .get(userId, BKT.masteredAt, BKT.minAttemptsForMastery) as { n: number }
  ).n;
  const perfect = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM (SELECT session, COUNT(*) AS c, SUM(correct) AS ok FROM attempts WHERE user_id = ? AND session IS NOT NULL
         GROUP BY session HAVING c >= 5 AND ok = c)`,
      )
      .get(userId) as { n: number }
  ).n;
  const questions = (db.prepare("SELECT COUNT(*) AS n FROM tutor_messages WHERE user_id = ? AND role = 'user'").get(userId) as { n: number }).n;
  // Longest streak ever, for the streak badges.
  const days = (db.prepare("SELECT DISTINCT day FROM xp_events WHERE user_id = ? ORDER BY day").all(userId) as { day: string }[]).map((r) => r.day);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && addDays(days[i - 1], 1) === days[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  best = Math.max(best, xp.streak);
  const earned: Record<(typeof BADGES)[number], boolean> = {
    first_steps: attempts > 0,
    streak_3: best >= 3,
    streak_7: best >= 7,
    first_mastery: mastered > 0,
    gap_bridger: bridged > 0,
    perfect_five: perfect > 0,
    curious_mind: questions >= 5,
    all_rounder: skillsTried >= SKILLS.length,
  };
  return BADGES.map((id) => ({ id, earned: earned[id] }));
}

export function classLeaderboard(classId: number, userId?: number) {
  const since = todayMY(-6);
  const rows = db
    .prepare(
      `SELECT u.id, u.name, COALESCE(SUM(CASE WHEN x.day >= ? THEN x.amount END), 0) AS week, COALESCE(SUM(x.amount), 0) AS total
       FROM users u LEFT JOIN xp_events x ON x.user_id = u.id
       WHERE u.class_id = ? AND u.role = 'student' GROUP BY u.id ORDER BY week DESC, total DESC`,
    )
    .all(since, classId) as { id: number; name: string; week: number; total: number }[];
  return rows.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, weekXp: r.week, totalXp: r.total, isYou: r.id === userId }));
}

// Mastery over time: replays BKT estimates from the attempt log, one point per day.
export function masteryHistory(userId: number, days = 42) {
  const rows = db.prepare("SELECT skill, p_after, created_at FROM attempts WHERE user_id = ? ORDER BY id").all(userId) as {
    skill: string;
    p_after: number;
    created_at: string;
  }[];
  const p = new Map<string, number>();
  const byDate = new Map<string, Map<string, number>>();
  for (const r of rows) {
    p.set(r.skill, r.p_after);
    byDate.set(toMYDate(r.created_at), new Map(p));
  }
  const start = todayMY(-(days - 1));
  const out: { day: string; math: number; sci: number }[] = [];
  let current = new Map<string, number>();
  // Carry forward the state from before the window.
  for (const [d, snap] of [...byDate.entries()].sort()) if (d < start) current = snap;
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    if (byDate.has(day)) current = byDate.get(day)!;
    const avg = (subject: string) => {
      const skills = SKILLS.filter((s) => s.subject === subject);
      return Math.round((skills.reduce((s, sk) => s + (current.get(sk.id) ?? BKT.pInit), 0) / skills.length) * 1000) / 10;
    };
    out.push({ day, math: avg("math"), sci: avg("sci") });
  }
  return out;
}

export function quizHistory(userId: number, limit = 12) {
  return (
    db
      .prepare(
        `SELECT session, MIN(created_at) AS started, COUNT(*) AS n, SUM(correct) AS correct, GROUP_CONCAT(DISTINCT skill) AS skills
         FROM attempts WHERE user_id = ? AND session IS NOT NULL GROUP BY session ORDER BY MAX(id) DESC LIMIT ?`,
      )
      .all(userId, limit) as { session: string; started: string; n: number; correct: number; skills: string }[]
  ).map((r) => ({ date: toMYDate(r.started), n: r.n, correct: r.correct, skills: r.skills.split(",") }));
}
