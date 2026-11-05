import type { FastifyInstance } from "fastify";
import type Anthropic from "@anthropic-ai/sdk";
import { PassThrough } from "node:stream";
import { z } from "zod";
import { db } from "../db.js";
import { langOf, requireStudent, requireUser } from "../auth.js";
import { SKILL_IDS } from "../content/curriculum.js";
import { AiError, toAiError } from "../ai/client.js";
import { buildContext, tutorStream, type TutorFocus } from "../ai/tutor.js";
import { getQuestion, addXp } from "../learning.js";
import { readImage, saveImage, UploadError } from "../uploads.js";

const HISTORY = 12;
const IMAGES_IN_HISTORY = 2;

const Fields = z.object({
  message: z.string().trim().max(1200).default(""),
  skill: z.enum(SKILL_IDS).optional(),
  questionId: z.coerce.number().int().positive().optional(),
  response: z.string().trim().max(40).optional(),
});

export async function tutorRoutes(app: FastifyInstance) {
  app.get("/api/tutor/history", { preHandler: requireStudent }, async (req) => {
    const rows = db
      .prepare("SELECT id, role, content, image, created_at FROM tutor_messages WHERE user_id = ? ORDER BY id DESC LIMIT 40")
      .all(req.user!.id) as { id: number; role: string; content: string; image: string | null; created_at: string }[];
    return rows.reverse().map((r) => ({ ...r, image: r.image ? `/api/images/${r.image}` : null }));
  });

  app.delete("/api/tutor/history", { preHandler: requireStudent }, async (req) => {
    db.prepare("DELETE FROM tutor_messages WHERE user_id = ?").run(req.user!.id);
    return { ok: true };
  });

  // Private images: only the owner, or the teacher of the owner's class, can see them.
  app.get("/api/images/:name", { preHandler: requireUser }, async (req, reply) => {
    const { name } = z.object({ name: z.string().max(64) }).parse(req.params);
    const u = req.user!;
    const owner = db
      .prepare(
        `SELECT user_id AS owner FROM tutor_messages WHERE image = ?
         UNION SELECT student_id AS owner FROM submissions WHERE image = ? LIMIT 1`,
      )
      .get(name, name) as { owner: number } | undefined;
    if (!owner) return reply.code(404).send({ error: "Not found." });
    let allowed = owner.owner === u.id;
    if (!allowed && u.role === "teacher" && u.class_id) {
      allowed = Boolean(db.prepare("SELECT 1 FROM users WHERE id = ? AND class_id = ?").get(owner.owner, u.class_id));
    }
    if (!allowed) return reply.code(404).send({ error: "Not found." });
    const buf = readImage(name);
    if (!buf) return reply.code(404).send({ error: "Not found." });
    return reply.header("Content-Type", "image/jpeg").header("Cache-Control", "private, max-age=3600").send(buf);
  });

  app.post(
    "/api/tutor",
    { preHandler: requireStudent, config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const user = req.user!;
      const lang = langOf(req);
      const raw: Record<string, string> = {};
      let image: { name: string; base64: string } | null = null;
      try {
        if (req.isMultipart()) {
          for await (const part of req.parts()) {
            if (part.type === "file") {
              if (image) {
                await part.toBuffer();
                continue;
              }
              image = await saveImage(part);
            } else if (typeof part.value === "string") {
              raw[part.fieldname] = part.value;
            }
          }
        } else {
          Object.assign(raw, req.body as Record<string, string>);
        }
      } catch (err) {
        if (err instanceof UploadError) return reply.code(err.status).send({ error: err.message });
        throw err;
      }
      const fields = Fields.safeParse(raw);
      if (!fields.success) return reply.code(400).send({ error: "Please type a question (up to 1200 characters)." });
      const { skill, questionId, response } = fields.data;
      let message = fields.data.message;

      let focus: TutorFocus | undefined;
      if (questionId && response) {
        const q = getQuestion(questionId);
        if (q) focus = { question: q, response };
      }
      if (!message && !image && !focus) return reply.code(400).send({ error: "Type a question or add a photo." });
      if (!message) {
        message = image
          ? lang === "ms"
            ? "Boleh tolong semak jalan kerja saya dalam gambar ini?"
            : "Can you check my working in this photo?"
          : lang === "ms"
            ? "Saya salah jawab soalan ini. Boleh bantu saya faham?"
            : "I got this question wrong. Can you help me understand it?";
      }

      // Rebuild recent history; only the latest couple of photos are re-sent to keep requests small.
      const past = db
        .prepare("SELECT role, content, image FROM tutor_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?")
        .all(user.id, HISTORY) as { role: "user" | "assistant"; content: string; image: string | null }[];
      past.reverse();
      while (past.length && past[0].role !== "user") past.shift();
      let imagesLeft = IMAGES_IN_HISTORY - (image ? 1 : 0);
      const imageIdx = new Set<number>();
      for (let i = past.length - 1; i >= 0 && imagesLeft > 0; i--) {
        if (past[i].image) {
          imageIdx.add(i);
          imagesLeft--;
        }
      }
      const history: Anthropic.Beta.BetaMessageParam[] = past.map((m, i) => {
        if (m.role === "user" && imageIdx.has(i)) {
          const buf = readImage(m.image!);
          if (buf) {
            return {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } },
                { type: "text", text: m.content },
              ],
            };
          }
        }
        return { role: m.role, content: m.image && m.role === "user" ? `[earlier photo] ${m.content}` : m.content };
      });
      history.push(
        image
          ? {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image.base64 } },
                { type: "text", text: message },
              ],
            }
          : { role: "user", content: message },
      );

      let stream;
      try {
        stream = tutorStream(buildContext(user.id, user.name, lang, focus, skill), history);
      } catch (err) {
        const e = toAiError(err);
        return reply.code(e.status).send({ error: e.message });
      }

      const shownMessage = focus && !fields.data.message ? `${message}\n\n> ${focus.question[lang === "ms" ? "stem_ms" : "stem_en"]}` : message;
      const out = new PassThrough();
      let text = "";
      let started = false;
      stream.on("text", (delta) => {
        started = true;
        text += delta;
        out.write(delta);
      });
      stream
        .finalMessage()
        .then((msg) => {
          if (msg.stop_reason === "refusal" && !text) {
            text =
              lang === "ms"
                ? "Maaf, saya tidak boleh membantu dengan itu. Jom kita fokus pada pelajaran: apa topik yang awak sedang belajar?"
                : "Sorry, I can't help with that one. Let's get back to learning: what topic are you working on?";
            out.write(text);
          }
          db.transaction(() => {
            const ins = db.prepare("INSERT INTO tutor_messages (user_id, role, content, image, skill) VALUES (?, ?, ?, ?, ?)");
            ins.run(user.id, "user", shownMessage, image?.name ?? null, skill ?? focus?.question.skill ?? null);
            if (text) ins.run(user.id, "assistant", text, null, skill ?? focus?.question.skill ?? null);
            addXp(user.id, 2, "tutor");
          })();
          out.end();
        })
        .catch((err: unknown) => {
          const e = err instanceof AiError ? err : toAiError(err);
          req.log.warn({ status: e.status }, "tutor stream failed");
          out.write(`${started ? "\n\n" : ""}⚠️ ${e.message}`);
          out.end();
        });

      reply
        .header("Content-Type", "text/plain; charset=utf-8")
        .header("Cache-Control", "no-cache")
        .header("X-Accel-Buffering", "no");
      return reply.send(out);
    },
  );
}
