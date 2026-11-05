// Demo class generator. Each "Try as Student / Teacher" click gets a private copy of class 2 Bestari:
// one teacher and 25 students whose 6 weeks of practice are SIMULATED through the real adaptive engine,
// so mastery, misconceptions and dashboards come from the same code paths as live use.
import crypto from "node:crypto";
import { db, sqliteTimeAgo, todayMY } from "./db.js";
import { SKILLS } from "./content/curriculum.js";
import type { Choice } from "./content/bank.js";
import { BKT, bktUpdate, eloUpdate, isMastered, pickQuestion, rankSkills, sigmoid, type QuestionLite, type SkillState } from "./ml/engine.js";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

interface Profile {
  name: string;
  ability: number; // overall
  mathBias: number; // + better at maths, − better at science
  engagement: number; // chance of practising on a school day
  factGap?: boolean; // part of the factorisation-sign-error cluster
  atRisk?: boolean; // stopped practising ~2 weeks ago
  hero?: boolean; // the demo student
}

// 25 students: names reflect a typical Malaysian classroom.
const PROFILES: Profile[] = [
  { name: "Aiman Hakimi", ability: 0.15, mathBias: -0.2, engagement: 0.8, factGap: true, hero: true },
  { name: "Nur Aisyah", ability: 1.1, mathBias: 0.2, engagement: 0.9 },
  { name: "Tan Wei Jie", ability: 0.9, mathBias: 0.5, engagement: 0.75 },
  { name: "Priya Nair", ability: 1.3, mathBias: -0.1, engagement: 0.85 },
  { name: "Muhammad Haziq", ability: -0.2, mathBias: 0.1, engagement: 0.6, factGap: true },
  { name: "Lim Mei Ling", ability: 0.6, mathBias: 0.3, engagement: 0.7 },
  { name: "Arjun Kumar", ability: 0.2, mathBias: 0.4, engagement: 0.65, factGap: true },
  { name: "Siti Hajar", ability: 0.4, mathBias: -0.4, engagement: 0.75, factGap: true },
  { name: "Daniel Wong", ability: -0.9, mathBias: 0.0, engagement: 0.3, atRisk: true },
  { name: "Farah Nabila", ability: 0.7, mathBias: -0.3, engagement: 0.8 },
  { name: "Kavitha Raj", ability: 0.0, mathBias: -0.2, engagement: 0.55, factGap: true },
  { name: "Luqman Hakim", ability: -0.4, mathBias: 0.2, engagement: 0.5 },
  { name: "Chong Jia Hui", ability: 1.0, mathBias: 0.6, engagement: 0.85 },
  { name: "Irfan Danial", ability: -1.1, mathBias: -0.1, engagement: 0.35, atRisk: true },
  { name: "Amirah Sofea", ability: 0.3, mathBias: -0.5, engagement: 0.7, factGap: true },
  { name: "Ravi Shankar", ability: 0.5, mathBias: 0.1, engagement: 0.6 },
  { name: "Zara Batrisyia", ability: -0.1, mathBias: -0.3, engagement: 0.65 },
  { name: "Ng Hong Wei", ability: 0.8, mathBias: 0.4, engagement: 0.7 },
  { name: "Syafiq Rahman", ability: -0.3, mathBias: 0.0, engagement: 0.55, factGap: true },
  { name: "Deepa Selvam", ability: 0.6, mathBias: -0.2, engagement: 0.8 },
  { name: "Alya Maisarah", ability: 0.2, mathBias: 0.1, engagement: 0.75 },
  { name: "Lee Jun Hao", ability: -0.6, mathBias: 0.3, engagement: 0.45, factGap: true },
  { name: "Iman Sofiya", ability: 0.9, mathBias: -0.4, engagement: 0.9 },
  { name: "Muthu Krishnan", ability: -1.0, mathBias: 0.2, engagement: 0.3, atRisk: true },
  { name: "Hana Qistina", ability: 0.4, mathBias: 0.0, engagement: 0.6 },
];

const HISTORY_DAYS = 42;
// The class follows the KSSM chapter order, one topic per week (oldest first). Circles, Coordinates and
// Electricity haven't been taught yet, so they stay "not started" for most of the class.
const MATH_WEEKS = ["m-seq", "m-exp", "m-fact", "m-fact", "m-form", "m-poly"];
const SCI_WEEKS = ["s-bio", "s-bio", "s-eco", "s-nutr", "s-water", "s-acid"];

interface SimQuestion extends QuestionLite {
  trueDifficulty: number;
  choices: Choice[] | null;
  answer: string;
}

export function createDemoClass(): { classId: number; teacherId: number; heroId: number } {
  const seed = 20261105;
  const rand = mulberry32(seed);
  const code = `DEMO-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const questions = (
    db.prepare("SELECT id, skill, kind, difficulty, choices_json, answer, slug FROM questions WHERE source = 'seed' AND status = 'active'").all() as {
      id: number;
      skill: string;
      kind: "mcq" | "num";
      difficulty: number;
      choices_json: string | null;
      answer: string;
      slug: string;
    }[]
  ).map(
    (q): SimQuestion => ({
      id: q.id,
      skill: q.skill,
      kind: q.kind,
      difficulty: q.difficulty,
      trueDifficulty: q.difficulty,
      choices: q.choices_json ? (JSON.parse(q.choices_json) as Choice[]) : null,
      answer: q.answer,
    }),
  );
  const bySkill = new Map<string, SimQuestion[]>();
  for (const q of questions) bySkill.set(q.skill, [...(bySkill.get(q.skill) ?? []), q]);
  const qCount = new Map<number, number>();

  return db.transaction(() => {
    const classId = Number(db.prepare("INSERT INTO classes (name, form, join_code, kind) VALUES (?, 2, ?, 'demo')").run("2 Bestari", code).lastInsertRowid);
    const teacherId = Number(
      db.prepare("INSERT INTO users (name, role, kind, class_id) VALUES (?, 'teacher', 'demo', ?)").run("Cikgu Nurul Huda", classId).lastInsertRowid,
    );
    const insUser = db.prepare("INSERT INTO users (name, role, kind, class_id) VALUES (?, 'student', 'demo', ?)");
    const insAttempt = db.prepare(
      `INSERT INTO attempts (user_id, question_id, skill, correct, response, misconception, p_before, p_after, session, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insMastery = db.prepare(
      "INSERT INTO mastery (user_id, skill, p_known, theta, n, n_correct, last_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const insXp = db.prepare("INSERT INTO xp_events (user_id, amount, reason, day, created_at) VALUES (?, ?, ?, ?, ?)");

    let heroId = 0;
    const studentIds: number[] = [];
    for (const p of PROFILES) {
      const userId = Number(insUser.run(p.name, classId).lastInsertRowid);
      studentIds.push(userId);
      if (p.hero) heroId = userId;

      // Latent "true" ability per skill (what the student really knows), unknown to the model.
      const truth = new Map<string, number>();
      for (const s of SKILLS) {
        let a = p.ability + (s.subject === "math" ? p.mathBias : -p.mathBias) + gauss(rand) * 0.45;
        if (p.factGap && s.id === "m-fact") a -= 1.6;
        if (p.factGap && s.id === "m-exp") a -= 0.4;
        if (p.hero && s.id === "m-exp") a = 0.1;
        if (p.hero && s.id === "m-fact") a = -2.6;
        if (p.hero && s.id === "m-poly") a = 1.2;
        if (p.hero && (s.id === "s-water" || s.id === "s-nutr")) a = 1.4;
        if (p.hero && s.subject === "sci") a += 0.5;
        truth.set(s.id, a);
      }
      const states = new Map<string, SkillState & { last: string | null }>();
      const recent: number[] = [];

      for (let day = HISTORY_DAYS; day >= 1; day--) {
        if (p.atRisk && day < 13) break; // stopped practising
        const date = todayMY(-day);
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        // The hero keeps a streak going for the last 5 days so the demo shows one.
        const active = p.hero && day <= 5 ? true : rand() < p.engagement * (weekend ? 0.5 : 1);
        if (!active) continue;

        const subject = rand() < 0.55 ? "math" : "sci";
        const week = Math.min(5, Math.floor((HISTORY_DAYS - day) / 7));
        const schedule = subject === "math" ? MATH_WEEKS : SCI_WEEKS;
        const taught = new Set(schedule.slice(0, week + 1));
        const n = 4 + Math.floor(rand() * 5);
        const hour = 15 + Math.floor(rand() * 7);
        let dayXp = 0;
        for (let i = 0; i < n; i++) {
          // Mostly this week's topic; otherwise the engine's pick among taught topics, or a random review.
          const r = rand();
          let skill: string;
          if (r < 0.55) skill = schedule[week];
          else if (r < 0.85) skill = rankSkills(states, subject).find((x) => taught.has(x.skill))?.skill ?? schedule[week];
          else {
            const list = [...taught];
            skill = list[Math.floor(rand() * list.length)];
          }
          if (p.ability > 0.8 && rand() < 0.04) skill = subject === "math" ? "m-circ" : "s-elec"; // keen students read ahead
          const pool = bySkill.get(skill) ?? [];
          const st = states.get(skill) ?? { skill, pKnown: BKT.pInit, theta: 0, n: 0, nCorrect: 0, daysSince: null, recentWrong: 0, last: null };
          const q = pickQuestion(pool, st.theta, new Set(recent.slice(-25)), rand) as SimQuestion | null;
          if (!q) continue;

          const t = truth.get(skill)!;
          const correct = rand() < sigmoid(t - q.trueDifficulty);
          let response = q.answer;
          let misconception: string | null = null;
          if (!correct) {
            if (q.kind === "mcq" && q.choices) {
              const wrong = q.choices.map((c, idx) => ({ c, idx })).filter((x) => String(x.idx) !== q.answer);
              const tagged = wrong.filter((x) => x.c.m);
              // The factorisation cluster mostly makes sign errors; everyone else slips more randomly.
              const signErr = wrong.filter((x) => x.c.m === "fact-sign");
              let pick = wrong[Math.floor(rand() * wrong.length)];
              if (p.factGap && skill === "m-fact" && signErr.length && rand() < 0.75) pick = signErr[Math.floor(rand() * signErr.length)];
              else if (tagged.length && rand() < (p.factGap ? 0.5 : 0.25)) pick = tagged[Math.floor(rand() * tagged.length)];
              response = String(pick.idx);
              misconception = pick.c.m ?? null;
            } else {
              response = String(Number(q.answer) + (rand() < 0.5 ? -1 : 1) * (1 + Math.floor(rand() * 4)));
            }
          }
          const pAfter = bktUpdate(st.pKnown, correct, q.kind);
          const elo = eloUpdate(st.theta, q.difficulty, correct, st.n, qCount.get(q.id) ?? 0);
          qCount.set(q.id, (qCount.get(q.id) ?? 0) + 1);
          q.difficulty = elo.difficulty;
          const at = sqliteTimeAgo(day, hour, i * 2 + Math.floor(rand() * 2));
          insAttempt.run(userId, q.id, skill, correct ? 1 : 0, response, misconception, st.pKnown, pAfter, `sim-${day}`, at);
          const wasMastered = isMastered(st.pKnown, st.n);
          states.set(skill, {
            ...st,
            pKnown: pAfter,
            theta: elo.theta,
            n: st.n + 1,
            nCorrect: st.nCorrect + (correct ? 1 : 0),
            daysSince: 0,
            recentWrong: 0,
            last: at,
          });
          recent.push(q.id);
          // Practice slowly improves what the student really knows (the factorisation gap barely moves on its own).
          truth.set(skill, t + (p.factGap && skill === "m-fact" ? 0.004 : 0.025));
          const xp = (correct ? 10 : 3) + (!wasMastered && isMastered(pAfter, st.n + 1) ? 50 : 0);
          dayXp += xp;
        }
        if (dayXp) insXp.run(userId, dayXp, "practice", date, sqliteTimeAgo(day, hour + 1));
      }
      for (const s of states.values()) insMastery.run(userId, s.skill, s.pKnown, s.theta, s.n, s.nCorrect, s.last);
    }

    seedAssignments(classId, teacherId, studentIds, heroId);
    return { classId, teacherId, heroId };
  })();
}

// Two assignments: an older Science one already graded and released, and an open Maths one waiting for marking.
function seedAssignments(classId: number, teacherId: number, studentIds: number[], heroId: number) {
  const insA = db.prepare(
    "INSERT INTO assignments (class_id, teacher_id, title, skill, prompt, rubric_json, max_score, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const sciRubric = [
    { criterion: "Energy source", max: 1, descriptor: "States that energy comes from the Sun via producers" },
    { criterion: "Energy loss", max: 2, descriptor: "Explains energy is lost as heat through respiration and movement at each level" },
    { criterion: "Consequence", max: 1, descriptor: "Links this to fewer organisms / shorter food chains at higher levels" },
  ];
  const sciId = Number(
    insA.run(
      classId,
      teacherId,
      "Energy in a food chain",
      "s-eco",
      "Explain why there is less energy available at each higher level of a food chain. Use the food chain grass → grasshopper → frog → snake.",
      JSON.stringify(sciRubric),
      4,
      todayMY(-9),
      sqliteTimeAgo(16, 9),
    ).lastInsertRowid,
  );
  const mathRubric = [
    { criterion: "Correct factors", max: 2, descriptor: "Reaches (x − 2)(x − 3)" },
    { criterion: "Method shown", max: 2, descriptor: "Shows a pair of numbers with product +6 and sum −5, with correct signs" },
    { criterion: "Checks the answer", max: 1, descriptor: "Expands the factors to confirm they give x² − 5x + 6" },
  ];
  const mathId = Number(
    insA.run(
      classId,
      teacherId,
      "Factorising quadratics",
      "m-fact",
      "Factorise x² − 5x + 6 completely. Show your working and explain how you checked your answer.",
      JSON.stringify(mathRubric),
      5,
      todayMY(3),
      sqliteTimeAgo(2, 8),
    ).lastInsertRowid,
  );

  const insS = db.prepare(
    `INSERT INTO submissions (assignment_id, student_id, answer_text, status, final_score, final_json, teacher_note, submitted_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const sciAnswers: [number, string, number, string][] = [
    [0, "Grass gets energy from the Sun. When the grasshopper eats grass, not all energy passes on because some is used for moving and lost as heat in respiration. Same for frog and snake, so the snake gets the least energy. That is why there are fewer snakes than grasshoppers.", 4, "Excellent, complete explanation."],
    [1, "Energy comes from the sun to the grass. At every level energy is lost as heat when animals respire and move, so less is passed up. So the top has the least energy.", 3, "Good. Add what this means for the number of snakes."],
    [3, "Each animal uses energy to live, and energy is lost as heat. So the snake gets less energy than the frog.", 2, "Correct idea of heat loss. Mention the Sun and the effect on numbers."],
    [4, "Because the snake is bigger so it needs more energy.", 0, "Let's look at this together in class: size is not the reason."],
    [6, "Energy is recycled by decomposers and goes back to the grass.", 0, "Careful: nutrients are recycled, energy is not."],
    [9, "Sun → grass. Energy lost as heat at each step (respiration, movement, undigested food). Less energy at the top so fewer snakes can be supported.", 4, "Very clear."],
  ];
  for (const [idx, text, score, note] of sciAnswers) {
    insS.run(sciId, studentIds[idx], text, "approved", score, null, note, sqliteTimeAgo(12, 20), sqliteTimeAgo(8, 10));
  }

  const mathAnswers: [number, string][] = [
    [1, "x² − 5x + 6. Need two numbers that multiply to 6 and add to −5: −2 and −3. So (x − 2)(x − 3). Check: x² − 3x − 2x + 6 = x² − 5x + 6 ✓"],
    [2, "(x − 2)(x − 3). −2 × −3 = 6, −2 + −3 = −5."],
    [4, "(x + 2)(x + 3) because 2 × 3 = 6 and 2 + 3 = 5"],
    [5, "Factors of 6: 1,6 and 2,3. 2 and 3 add to 5 so (x − 2)(x − 3). I expanded it back and got x² − 5x + 6."],
    [6, "(x + 2)(x − 3)"],
    [7, "x(x − 5) + 6"],
    [9, "−2 and −3 multiply to +6 and add to −5. Answer (x − 2)(x − 3). Checked by expanding: x² −3x −2x +6."],
    [10, "(x − 6)(x + 1) because −6 × 1 = −6"],
    [12, "(x−2)(x−3)"],
    [14, "(x + 3)(x + 2) = x² + 5x + 6"],
    [17, "We need product 6 sum −5 → −2, −3. (x − 3)(x − 2). Check: (x−3)(x−2) = x² −2x −3x +6 = x² −5x +6"],
    [19, "(x − 2)(x − 3) I think because 2 and 3 make 6"],
  ];
  for (const [idx, text] of mathAnswers) {
    if (studentIds[idx] === heroId) continue;
    insS.run(mathId, studentIds[idx], text, "submitted", null, null, null, sqliteTimeAgo(1, 19 + (idx % 3)), null);
  }
}

export function cleanupDemoClasses() {
  db.prepare("DELETE FROM classes WHERE kind = 'demo' AND created_at < datetime('now', '-7 days')").run();
}
