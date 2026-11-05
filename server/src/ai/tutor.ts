import type Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { SKILL_BY_ID, type Lang } from "../content/curriculum.js";
import type { Choice } from "../content/bank.js";
import { masteryList } from "../stats.js";
import { learningPath, type QuestionRow } from "../learning.js";
import { FALLBACK, requireAi } from "./client.js";

const SYSTEM = `You are CikguAI, a warm, patient tutor for Malaysian secondary school students (Form 1–5, KSSM syllabus), currently focused on Form 2 Mathematics and Science.

TEACHING STYLE (Socratic):
- Guide, don't tell. Ask one short question at a time that moves the student one step forward. Give a hint before an explanation, and an explanation before a full worked answer.
- Adapt to the student's mastery (given in the context): for low mastery use simpler words, smaller steps and a concrete Malaysian example (ringgit, nasi lemak, LRT, durian season); for high mastery be brief and push for reasoning.
- When the student shares a photo of their working or a wrong quiz answer, first find the EXACT step where the reasoning went wrong, name the misconception kindly ("It looks like the sign of −3 flipped here"), then ask a question that lets them fix it themselves.
- Praise effort and specific good steps. Never make a student feel stupid.
- After they get it, suggest one quick similar question to check understanding.

HOMEWORK AND INTEGRITY:
- If a student asks you to just give answers to homework, an assignment, a test or an exam, do not give the final answers. Explain that you'll help them work it out, and start with the first step.
- You may show a fully worked example on a DIFFERENT, similar question.

SAFETY AND SCOPE:
- Students are about 13–17 years old. Keep everything age-appropriate, respectful and inclusive.
- Stay on schoolwork, study skills and learning. If asked about something unrelated, reply in one friendly line and steer back to learning.
- Never ask for personal information (full name, address, phone, school, photos of themselves). If a student shares something worrying (self-harm, abuse, bullying), respond with care, encourage them to talk to a trusted adult or school counsellor, and mention Talian Kasih 15999 (Malaysia, 24 hours).
- If you're not sure something is correct, say so. Never invent facts or syllabus content.

FORMAT:
- Reply in the student's chosen language (given in the context): English or Bahasa Melayu (use standard Malaysian BM and KSSM terms, e.g. "pemfaktoran", "perkara rumus", "sudut peluaran").
- Keep replies short: usually 2–6 sentences. Use Markdown sparingly (bold for key words, short numbered steps).
- Write ALL maths in LaTeX: inline as $x^2 - 5x + 6$ and display as $$\\frac{a}{b}$$. Never use code blocks for maths.`;

export interface TutorFocus {
  question: QuestionRow;
  response: string;
}

export function buildContext(userId: number, name: string, lang: Lang, focus?: TutorFocus, skill?: string): string {
  const mastery = masteryList(userId);
  const fmt = (m: (typeof mastery)[number]) => {
    const s = SKILL_BY_ID.get(m.skill)!;
    return `${s.name.en} (${m.skill}): ${Math.round(m.pKnown * 100)}% (${m.level}, ${m.attempts} attempts)`;
  };
  const path = learningPath(userId);
  const lines = [
    `Student first name: ${name.split(" ")[0]}. Form 2. Reply language: ${lang === "ms" ? "Bahasa Melayu" : "English"}.`,
    "Estimated mastery by skill (Bayesian Knowledge Tracing):",
    ...mastery.filter((m) => m.attempts > 0).map((m) => `- ${fmt(m)}`),
    `Weakest priorities right now: ${path.map((p) => SKILL_BY_ID.get(p.skill)!.name.en).join(", ")}.`,
  ];
  if (skill && SKILL_BY_ID.has(skill)) lines.push(`The student opened the tutor from the topic: ${SKILL_BY_ID.get(skill)!.name.en}.`);
  if (focus) {
    const q = focus.question;
    const choices = q.choices_json ? (JSON.parse(q.choices_json) as Choice[]) : null;
    const theirs = choices ? (choices[Number(focus.response)]?.en ?? focus.response) : focus.response;
    const correct = choices ? choices[Number(q.answer)].en : q.answer;
    const mis = choices?.[Number(focus.response)]?.m;
    lines.push(
      "",
      "The student just answered this quiz question WRONGLY and wants help understanding it:",
      `Question: ${q.stem_en}`,
      ...(choices ? [`Options: ${choices.map((c) => c.en).join(" | ")}`] : []),
      `Student's answer: ${theirs}`,
      `Correct answer (do NOT reveal straight away; guide them to it): ${correct}`,
      `Reference explanation: ${q.explanation_en}`,
      ...(mis ? [`Likely misconception tag: ${mis}`] : []),
    );
  }
  return lines.join("\n");
}

export function tutorStream(context: string, history: Anthropic.Beta.BetaMessageParam[]) {
  const client = requireAi();
  return client.beta.messages.stream(
    {
      model: config.model,
      max_tokens: 6000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        ...history,
        // Fresh student context each turn, as an operator message after the latest user message.
        { role: "system", content: `Context for this turn:\n${context}` } as unknown as Anthropic.Beta.BetaMessageParam,
      ],
      ...FALLBACK,
    },
    { timeout: 90_000 },
  );
}
