import { MATH_BANK } from "./bank-math.js";
import { SCIENCE_BANK } from "./bank-science.js";
import { MISCONCEPTIONS, SKILL_BY_ID } from "./curriculum.js";

type Text = string | [string, string];
type ChoiceSpec = Text | { t: Text; m: string };

// Authoring format for the starter bank. For "mcq", c[0] is the correct answer.
export interface SeedQ {
  id: string;
  skill: string;
  d: number;
  kind: "mcq" | "num";
  q: [string, string];
  c?: ChoiceSpec[];
  a?: number;
  e: [string, string];
}

export interface Choice {
  en: string;
  ms: string;
  m?: string; // misconception id when this wrong choice reveals one
}

export interface BankQuestion {
  slug: string;
  skill: string;
  kind: "mcq" | "num";
  difficulty: number;
  stem_en: string;
  stem_ms: string;
  choices: Choice[] | null;
  answer: string; // mcq: index of the correct choice; num: the numeric answer
  explanation_en: string;
  explanation_ms: string;
}

function bi(t: Text): { en: string; ms: string } {
  return typeof t === "string" ? { en: t, ms: t } : { en: t[0], ms: t[1] };
}

// Deterministic shuffle so the correct answer isn't always first, but stays stable across restarts.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function toBankQuestion(q: SeedQ): BankQuestion {
  if (!SKILL_BY_ID.has(q.skill)) throw new Error(`Unknown skill ${q.skill} in ${q.id}`);
  let choices: Choice[] | null = null;
  let answer: string;
  if (q.kind === "mcq") {
    if (!q.c || q.c.length < 2) throw new Error(`MCQ ${q.id} needs choices`);
    const specs = q.c.map((c, i) => {
      const isObj = typeof c === "object" && !Array.isArray(c);
      const text = bi(isObj ? c.t : (c as Text));
      const m = isObj ? c.m : undefined;
      if (m && !MISCONCEPTIONS[m]) throw new Error(`Unknown misconception ${m} in ${q.id}`);
      return { ...text, ...(m ? { m } : {}), correct: i === 0 };
    });
    let seed = hash(q.id);
    for (let i = specs.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const j = seed % (i + 1);
      [specs[i], specs[j]] = [specs[j], specs[i]];
    }
    answer = String(specs.findIndex((s) => s.correct));
    choices = specs.map(({ correct: _c, ...rest }) => rest);
  } else {
    if (typeof q.a !== "number") throw new Error(`Numeric ${q.id} needs an answer`);
    answer = String(q.a);
  }
  return {
    slug: q.id,
    skill: q.skill,
    kind: q.kind,
    difficulty: q.d,
    stem_en: q.q[0],
    stem_ms: q.q[1],
    choices,
    answer,
    explanation_en: q.e[0],
    explanation_ms: q.e[1],
  };
}

export const STARTER_BANK: BankQuestion[] = [...MATH_BANK, ...SCIENCE_BANK].map(toBankQuestion);
