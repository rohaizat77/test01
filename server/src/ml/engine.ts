// CikguAI adaptive engine: Bayesian Knowledge Tracing for mastery + Elo (1-parameter logistic / Rasch) ratings
// for student ability and question difficulty. Pure functions, so the same code drives live quizzes,
// the demo-class simulator and the unit tests.

import { SKILLS, SKILL_BY_ID } from "../content/curriculum.js";

// ── Bayesian Knowledge Tracing (Corbett & Anderson, 1995) ──
export const BKT = {
  pInit: 0.15, // P(L0): chance a student already knows a skill before practising it
  pLearn: 0.1, // P(T): chance of learning the skill on each practice opportunity
  pSlip: 0.1, // P(S): knows it but answers wrongly
  pGuessMcq: 0.25, // P(G) for 4-option multiple choice
  pGuessNum: 0.05, // P(G) for a typed numeric answer
  masteredAt: 0.9, // "mastered" from here (classic BKT uses 0.95; 0.9 suits short school practice)
  minAttemptsForMastery: 4, // and never on fewer than 4 answers
  pMax: 0.99, // cap so one slip after a long streak still moves the estimate
};

export function bktUpdate(pKnown: number, correct: boolean, kind: "mcq" | "num"): number {
  const g = kind === "mcq" ? BKT.pGuessMcq : BKT.pGuessNum;
  const s = BKT.pSlip;
  const posterior = correct
    ? (pKnown * (1 - s)) / (pKnown * (1 - s) + (1 - pKnown) * g)
    : (pKnown * s) / (pKnown * s + (1 - pKnown) * (1 - g));
  const next = posterior + (1 - posterior) * BKT.pLearn;
  return clamp(next, 0.01, BKT.pMax);
}

// P(correct) under BKT, useful for explaining the model.
export function bktPCorrect(pKnown: number, kind: "mcq" | "num"): number {
  const g = kind === "mcq" ? BKT.pGuessMcq : BKT.pGuessNum;
  return pKnown * (1 - BKT.pSlip) + (1 - pKnown) * g;
}

// ── Elo / Rasch ratings on a logit scale ──
// P(correct) = σ(θ_student,skill − b_question). Both are nudged after every answer, with K shrinking as evidence grows.
export function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export function eloExpected(theta: number, difficulty: number) {
  return sigmoid(theta - difficulty);
}

export function eloUpdate(theta: number, difficulty: number, correct: boolean, nStudent: number, nQuestion: number) {
  const expected = eloExpected(theta, difficulty);
  const y = correct ? 1 : 0;
  const kStudent = Math.max(0.15, 0.8 / (1 + 0.08 * nStudent));
  const kQuestion = Math.max(0.03, 0.4 / (1 + 0.05 * nQuestion));
  return {
    theta: clamp(theta + kStudent * (y - expected), -4, 4),
    difficulty: clamp(difficulty - kQuestion * (y - expected), -4, 4),
    expected,
  };
}

// ── Question selection ──
export const TARGET_SUCCESS = 0.7; // "desirable difficulty": hard enough to learn, easy enough to stay motivated

export interface QuestionLite {
  id: number;
  skill: string;
  kind: "mcq" | "num";
  difficulty: number;
}

export function pickQuestion(
  candidates: QuestionLite[],
  theta: number,
  recentIds: Set<number>,
  rand: () => number = Math.random,
): QuestionLite | null {
  const fresh = candidates.filter((q) => !recentIds.has(q.id));
  const pool = fresh.length ? fresh : candidates;
  if (!pool.length) return null;
  // Score by distance from the target success rate; small jitter avoids always serving the same item.
  const scored = pool
    .map((q) => ({ q, score: Math.abs(eloExpected(theta, q.difficulty) - TARGET_SUCCESS) + rand() * 0.06 }))
    .sort((a, b) => a.score - b.score);
  return scored[0].q;
}

// ── Skill prioritisation ("bridge the gap") ──
export interface SkillState {
  skill: string;
  pKnown: number;
  theta: number;
  n: number;
  nCorrect: number;
  daysSince: number | null; // null = never practised
  recentWrong: number; // wrong answers in the last 5 attempts on this skill
}

export interface PathStep {
  skill: string;
  priority: number;
  reasons: { code: string; value?: number; skill?: string }[];
}

// Ranks skills for "Your next 3 things to study". Weak skills first, but a weak prerequisite is
// fixed before the skill that depends on it, and mastered skills come back for spaced review.
export function rankSkills(states: Map<string, SkillState>, subject?: string): PathStep[] {
  const steps: PathStep[] = [];
  for (const skill of SKILLS) {
    if (subject && skill.subject !== subject) continue;
    const s = states.get(skill.id) ?? { skill: skill.id, pKnown: BKT.pInit, theta: 0, n: 0, nCorrect: 0, daysSince: null, recentWrong: 0 };
    const reasons: PathStep["reasons"] = [];
    let priority = 1 - s.pKnown; // weakness

    if (s.n === 0) {
      reasons.push({ code: "not_started" });
      priority = 0.45;
    } else if (!isMastered(s.pKnown, s.n)) {
      reasons.push({ code: "low_mastery", value: Math.round(s.pKnown * 100) });
      if (s.recentWrong >= 2) {
        priority += 0.1;
        reasons.push({ code: "recent_mistakes", value: s.recentWrong });
      }
    } else if (s.daysSince !== null && s.daysSince >= 10) {
      priority = 0.3 + Math.min(0.2, s.daysSince / 100);
      reasons.push({ code: "review_due", value: s.daysSince });
    } else {
      priority = 0.05;
      reasons.push({ code: "mastered" });
    }

    // Unlocks: a weak skill that other skills build on gets a boost.
    const dependants = SKILLS.filter((d) => d.prereqs.includes(skill.id));
    const weakDependants = dependants.filter((d) => {
      const st = states.get(d.id);
      return !isMastered(st?.pKnown ?? BKT.pInit, st?.n ?? 0);
    });
    if (!isMastered(s.pKnown, s.n) && weakDependants.length) {
      priority += 0.15;
      reasons.push({ code: "unlocks", skill: weakDependants[0].id });
    }
    // A skill whose own prerequisite is weak is held back slightly: fix the foundation first.
    const weakPrereq = skill.prereqs.find((p) => (states.get(p)?.pKnown ?? BKT.pInit) < 0.6);
    if (weakPrereq && !isMastered(s.pKnown, s.n)) {
      priority -= 0.2;
      reasons.push({ code: "needs_prereq", skill: weakPrereq });
    }
    steps.push({ skill: skill.id, priority, reasons });
  }
  return steps.sort((a, b) => b.priority - a.priority);
}

export function masteryLevel(p: number, n: number): "new" | "learning" | "developing" | "mastered" {
  if (n === 0) return "new";
  if (isMastered(p, n)) return "mastered";
  if (p >= 0.6) return "developing";
  return "learning";
}

export function isMastered(p: number, n: number) {
  return p >= BKT.masteredAt && n >= BKT.minAttemptsForMastery;
}

export function checkAnswer(kind: "mcq" | "num", answer: string, response: string): boolean {
  if (kind === "mcq") return response.trim() === answer;
  const r = Number(response.replace(/,/g, "").replace(/\s+/g, "").replace(/−/g, "-"));
  const a = Number(answer);
  if (!Number.isFinite(r)) return false;
  return Math.abs(r - a) <= Math.max(1e-6, Math.abs(a) * 0.005);
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function skillSubject(skill: string) {
  return SKILL_BY_ID.get(skill)?.subject;
}
