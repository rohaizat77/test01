import { test } from "node:test";
import assert from "node:assert/strict";
import { BKT, bktUpdate, checkAnswer, eloUpdate, isMastered, pickQuestion, rankSkills, type SkillState } from "../src/ml/engine.ts";
import { STARTER_BANK } from "../src/content/bank.ts";
import { SKILLS } from "../src/content/curriculum.ts";

test("BKT: correct answers raise mastery, wrong answers lower it", () => {
  const up = bktUpdate(0.5, true, "mcq");
  const down = bktUpdate(0.5, false, "mcq");
  assert.ok(up > 0.5 && down < 0.5);
  // A typed numeric answer is stronger evidence than a guessable MCQ.
  assert.ok(bktUpdate(0.3, true, "num") > bktUpdate(0.3, true, "mcq"));
});

test("BKT: four correct in a row from scratch reaches mastery", () => {
  let p = BKT.pInit;
  for (let i = 0; i < 4; i++) p = bktUpdate(p, true, "mcq");
  assert.ok(isMastered(p, 4), `p=${p}`);
  assert.equal(isMastered(0.99, 3), false, "needs at least 4 answers");
});

test("BKT stays within bounds", () => {
  let p = 0.5;
  for (let i = 0; i < 50; i++) p = bktUpdate(p, true, "num");
  assert.ok(p <= BKT.pMax);
  for (let i = 0; i < 50; i++) p = bktUpdate(p, false, "num");
  assert.ok(p > 0);
});

test("Elo: a surprising correct answer moves ratings more than an expected one", () => {
  const hard = eloUpdate(0, 2, true, 0, 0);
  const easy = eloUpdate(0, -2, true, 0, 0);
  assert.ok(hard.theta - 0 > easy.theta - 0);
  assert.ok(hard.difficulty < 2, "question looks easier after being solved");
});

test("pickQuestion targets about 70% expected success and skips recent items", () => {
  const qs = [-2, -1, 0, 0.85, 2].map((d, i) => ({ id: i + 1, skill: "m-fact", kind: "mcq" as const, difficulty: d }));
  const q = pickQuestion(qs, 0, new Set(), () => 0);
  assert.equal(q?.difficulty, -1); // σ(0 − (−1)) ≈ 0.73, closest to 0.7
  const q2 = pickQuestion(qs, 0, new Set([2]), () => 0);
  assert.notEqual(q2?.id, 2);
});

test("rankSkills fixes a weak prerequisite before the skill that depends on it", () => {
  const st = (skill: string, p: number, n = 10): SkillState => ({ skill, pKnown: p, theta: 0, n, nCorrect: 5, daysSince: 1, recentWrong: 0 });
  const states = new Map([
    ["m-exp", st("m-exp", 0.4)],
    ["m-fact", st("m-fact", 0.3)],
  ]);
  const ranked = rankSkills(states, "math");
  assert.equal(ranked[0].skill, "m-exp");
  assert.ok(ranked[0].reasons.some((r) => r.code === "unlocks"));
});

test("checkAnswer handles numeric formats", () => {
  assert.ok(checkAnswer("num", "-2", "−2"));
  assert.ok(checkAnswer("num", "154", " 154 "));
  assert.ok(checkAnswer("num", "1000", "1,000"));
  assert.equal(checkAnswer("num", "49", "48"), false);
  assert.ok(checkAnswer("mcq", "2", "2"));
});

test("starter bank: every skill has questions, every MCQ has a valid answer and 4 distinct options", () => {
  for (const s of SKILLS) assert.ok(STARTER_BANK.filter((q) => q.skill === s.id).length >= 10, s.id);
  for (const q of STARTER_BANK) {
    if (q.kind === "mcq") {
      assert.equal(q.choices!.length, 4, q.slug);
      assert.equal(new Set(q.choices!.map((c) => c.en)).size, 4, q.slug);
      assert.ok(Number(q.answer) >= 0 && Number(q.answer) < 4, q.slug);
      assert.equal(q.choices![Number(q.answer)].m, undefined, `${q.slug}: correct answer tagged as misconception`);
    } else {
      assert.ok(Number.isFinite(Number(q.answer)), q.slug);
    }
    assert.ok(q.stem_ms && q.explanation_ms, `${q.slug} needs Malay text`);
  }
});
