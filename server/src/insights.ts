// Class-level analytics for teachers. All numbers are computed here from the attempt log and BKT
// estimates; the AI summary only interprets these numbers.
import { db, todayMY, addDays, toMYDate } from "./db.js";
import { MISCONCEPTIONS, SKILLS } from "./content/curriculum.js";
import { BKT, isMastered } from "./ml/engine.js";

export interface StudentRow {
  id: number;
  name: string;
  mastery: Record<string, number | null>; // null = not started
  avgMastery: number;
  lastActive: string | null;
  daysInactive: number | null;
  weekXp: number;
  attempts14: number;
  accuracy14: number | null;
  change14: number; // mastery points gained in 14 days (avg across practised skills, ×100)
  risk: { level: "high" | "watch" | "ok"; reasons: string[] };
}

export function classOverview(classId: number) {
  const students = db.prepare("SELECT id, name FROM users WHERE class_id = ? AND role = 'student' ORDER BY name").all(classId) as {
    id: number;
    name: string;
  }[];
  const ids = students.map((s) => s.id);
  if (!ids.length) return emptyOverview();
  const ph = ids.map(() => "?").join(",");

  const masteryRows = db.prepare(`SELECT user_id, skill, p_known, n FROM mastery WHERE user_id IN (${ph})`).all(...ids) as {
    user_id: number;
    skill: string;
    p_known: number;
    n: number;
  }[];
  const lastRows = db
    .prepare(`SELECT user_id, MAX(created_at) AS last FROM attempts WHERE user_id IN (${ph}) GROUP BY user_id`)
    .all(...ids) as { user_id: number; last: string }[];
  const since14 = `${todayMY(-13)} 00:00:00`;
  const recentRows = db
    .prepare(
      `SELECT user_id, COUNT(*) AS n, SUM(correct) AS ok FROM attempts WHERE user_id IN (${ph}) AND created_at >= datetime(?, '-8 hours') GROUP BY user_id`,
    )
    .all(...ids, since14) as { user_id: number; n: number; ok: number }[];
  // Mastery 14 days ago: the p_after of the last attempt before the window, per skill.
  const before = db
    .prepare(
      `SELECT user_id, skill, p_after FROM (
         SELECT user_id, skill, p_after, ROW_NUMBER() OVER (PARTITION BY user_id, skill ORDER BY id DESC) AS rn
         FROM attempts WHERE user_id IN (${ph}) AND created_at < datetime(?, '-8 hours')
       ) WHERE rn = 1`,
    )
    .all(...ids, since14) as { user_id: number; skill: string; p_after: number }[];
  const weekXp = db
    .prepare(`SELECT user_id, SUM(amount) AS xp FROM xp_events WHERE user_id IN (${ph}) AND day >= ? GROUP BY user_id`)
    .all(...ids, todayMY(-6)) as { user_id: number; xp: number }[];

  const now = todayMY();
  const rows: StudentRow[] = students.map((s) => {
    const mastery: Record<string, number | null> = {};
    for (const sk of SKILLS) mastery[sk.id] = null;
    const mine = masteryRows.filter((m) => m.user_id === s.id);
    for (const m of mine) if (m.n > 0) mastery[m.skill] = Math.round(m.p_known * 1000) / 1000;
    const practised = mine.filter((m) => m.n > 0);
    const avgMastery = practised.length ? practised.reduce((a, m) => a + m.p_known, 0) / practised.length : 0;
    const last = lastRows.find((l) => l.user_id === s.id)?.last ?? null;
    const lastActive = last ? toMYDate(last) : null;
    const daysInactive = lastActive ? Math.round((Date.parse(now) - Date.parse(lastActive)) / 86400_000) : null;
    const rec = recentRows.find((r) => r.user_id === s.id);
    const prev = before.filter((b) => b.user_id === s.id);
    const deltas = practised.map((m) => m.p_known - (prev.find((p) => p.skill === m.skill)?.p_after ?? BKT.pInit));
    const change14 = deltas.length ? Math.round((deltas.reduce((a, d) => a + d, 0) / deltas.length) * 100) : 0;
    const accuracy14 = rec && rec.n ? Math.round((rec.ok / rec.n) * 100) : null;

    const reasons: string[] = [];
    if (daysInactive === null || daysInactive >= 7) reasons.push("inactive");
    if (practised.length && avgMastery < 0.45) reasons.push("low_mastery");
    if (accuracy14 !== null && accuracy14 < 45 && (rec?.n ?? 0) >= 8) reasons.push("low_accuracy");
    if (change14 < -3) reasons.push("declining");
    const level = reasons.length >= 2 || (reasons.includes("inactive") && (daysInactive ?? 99) >= 10) ? "high" : reasons.length ? "watch" : "ok";
    return {
      id: s.id,
      name: s.name,
      mastery,
      avgMastery: Math.round(avgMastery * 1000) / 1000,
      lastActive,
      daysInactive,
      weekXp: weekXp.find((w) => w.user_id === s.id)?.xp ?? 0,
      attempts14: rec?.n ?? 0,
      accuracy14,
      change14,
      risk: { level, reasons },
    };
  });

  const skills = SKILLS.map((sk) => {
    const vals = rows.map((r) => r.mastery[sk.id]).filter((v): v is number => v !== null);
    const masteredCount = masteryRows.filter((m) => m.skill === sk.id && isMastered(m.p_known, m.n)).length;
    const struggling = rows.filter((r) => r.mastery[sk.id] !== null && r.mastery[sk.id]! < 0.5);
    return {
      skill: sk.id,
      subject: sk.subject,
      avg: vals.length ? Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 1000) / 1000 : null,
      started: vals.length,
      mastered: masteredCount,
      struggling: struggling.map((r) => ({ id: r.id, name: r.name, p: r.mastery[sk.id]! })),
    };
  });

  // A misconception counts for a student once they've repeated it (3+ times in 30 days): one slip isn't a pattern.
  const misRows = db
    .prepare(
      `SELECT id, SUM(n) AS n, COUNT(*) AS students, GROUP_CONCAT(user_id) AS users FROM (
         SELECT a.misconception AS id, a.user_id, COUNT(*) AS n FROM attempts a
         WHERE a.user_id IN (${ph}) AND a.misconception IS NOT NULL AND a.created_at >= datetime('now', '-30 days')
         GROUP BY a.misconception, a.user_id HAVING COUNT(*) >= 3
       ) GROUP BY id ORDER BY students DESC, n DESC LIMIT 8`,
    )
    .all(...ids) as { id: string; n: number; students: number; users: string }[];
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const misconceptions = misRows
    .filter((m) => MISCONCEPTIONS[m.id])
    .map((m) => ({
      id: m.id,
      skill: MISCONCEPTIONS[m.id].skill,
      label: MISCONCEPTIONS[m.id].label,
      count: m.n,
      students: m.users.split(",").map((u) => ({ id: Number(u), name: nameById.get(Number(u)) ?? "" })),
    }));

  const activity = db
    .prepare(
      `SELECT date(created_at, '+8 hours') AS day, COUNT(*) AS n, COUNT(DISTINCT user_id) AS active FROM attempts
       WHERE user_id IN (${ph}) AND created_at >= datetime(?, '-8 hours') GROUP BY day`,
    )
    .all(...ids, `${todayMY(-13)} 00:00:00`) as { day: string; n: number; active: number }[];
  const actMap = new Map(activity.map((a) => [a.day, a]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(todayMY(), -13 + i);
    return { day, attempts: actMap.get(day)?.n ?? 0, active: actMap.get(day)?.active ?? 0 };
  });

  const activeThisWeek = rows.filter((r) => r.daysInactive !== null && r.daysInactive < 7).length;
  return {
    students: rows,
    skills,
    misconceptions,
    activity: days,
    totals: {
      students: rows.length,
      activeThisWeek,
      atRisk: rows.filter((r) => r.risk.level === "high").length,
      watch: rows.filter((r) => r.risk.level === "watch").length,
      avgMastery: rows.length ? Math.round((rows.reduce((a, r) => a + r.avgMastery, 0) / rows.length) * 1000) / 1000 : 0,
      attempts14: rows.reduce((a, r) => a + r.attempts14, 0),
    },
  };
}

function emptyOverview() {
  return {
    students: [] as StudentRow[],
    skills: [] as { skill: string; subject: string; avg: number | null; started: number; mastered: number; struggling: { id: number; name: string; p: number }[] }[],
    misconceptions: [] as { id: string; skill: string; label: { en: string; ms: string }; count: number; students: { id: number; name: string }[] }[],
    activity: [] as { day: string; attempts: number; active: number }[],
    totals: { students: 0, activeThisWeek: 0, atRisk: 0, watch: 0, avgMastery: 0, attempts14: 0 },
  };
}

export type ClassOverview = ReturnType<typeof classOverview>;
