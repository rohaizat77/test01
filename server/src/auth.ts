import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { db } from "./db.js";
import { createDemoClass, cleanupDemoClasses } from "./seed.js";
import type { Lang } from "./content/curriculum.js";

export interface SessionUser {
  id: number;
  email: string | null;
  name: string;
  role: "student" | "teacher";
  kind: "user" | "demo";
  class_id: number | null;
  class_name: string | null;
  lang: Lang;
  daily_goal: number;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

const COOKIE = "cikguai_sid";
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);
const SESSION_DAYS = 14;

function createSession(reply: FastifyReply, userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires.toISOString());
  reply.setCookie(COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", secure: config.isProd, expires });
}

export async function loadUser(req: FastifyRequest) {
  const token = req.cookies[COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.kind, u.class_id, c.name AS class_name, u.lang, u.daily_goal
       FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN classes c ON c.id = u.class_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as SessionUser | undefined;
  if (row) req.user = row;
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: "Please sign in to continue." });
}
export async function requireStudent(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: "Please sign in to continue." });
  if (req.user.role !== "student") return reply.code(403).send({ error: "This page is for students." });
}
export async function requireTeacher(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: "Please sign in to continue." });
  if (req.user.role !== "teacher") return reply.code(403).send({ error: "This page is for teachers." });
  if (!req.user.class_id) return reply.code(403).send({ error: "Your account isn't linked to a class yet." });
}

// Language: an explicit ?lang= or body.lang wins, then the user's saved preference.
export function langOf(req: FastifyRequest): Lang {
  const q = (req.query as { lang?: string } | undefined)?.lang;
  if (q === "ms" || q === "en") return q;
  return req.user?.lang ?? "en";
}

const publicUser = (u: SessionUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  classId: u.class_id,
  className: u.class_name,
  isDemo: u.kind === "demo",
  lang: u.lang,
  dailyGoal: u.daily_goal,
});

const RegisterBody = z.object({
  role: z.enum(["student", "teacher"]),
  email: z.email().max(120),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  name: z.string().trim().min(1).max(60),
  classCode: z.string().trim().max(20).optional(),
  className: z.string().trim().min(1).max(40).optional(),
});
const LoginBody = z.object({ email: z.email().max(120), password: z.string().min(1).max(128) });

function newJoinCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function authRoutes(app: FastifyInstance) {
  const authLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  app.get("/api/me", async (req) => {
    let joinCode: string | null = null;
    if (req.user?.role === "teacher" && req.user.class_id) {
      joinCode = (db.prepare("SELECT join_code FROM classes WHERE id = ?").get(req.user.class_id) as { join_code: string }).join_code;
    }
    return { user: req.user ? { ...publicUser(req.user), joinCode } : null, aiEnabled: config.hasAiKey };
  });

  app.patch("/api/me", { preHandler: requireUser }, async (req, reply) => {
    const body = z.object({ lang: z.enum(["en", "ms"]).optional(), dailyGoal: z.number().int().min(20).max(300).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid settings." });
    if (body.data.lang) db.prepare("UPDATE users SET lang = ? WHERE id = ?").run(body.data.lang, req.user!.id);
    if (body.data.dailyGoal) db.prepare("UPDATE users SET daily_goal = ? WHERE id = ?").run(body.data.dailyGoal, req.user!.id);
    return { ok: true };
  });

  app.post("/api/auth/register", authLimit, async (req, reply) => {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid details." });
    const { email, password, name, role, classCode, className } = parsed.data;
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      return reply.code(409).send({ error: "An account with that email already exists." });
    }
    let classId: number | null = null;
    if (role === "student" && classCode) {
      const c = db.prepare("SELECT id FROM classes WHERE join_code = ? AND kind = 'real'").get(classCode.toUpperCase()) as { id: number } | undefined;
      if (!c) return reply.code(404).send({ error: "We couldn't find a class with that code. Check with your teacher." });
      classId = c.id;
    }
    const hash = await bcrypt.hash(password, 12);
    const userId = db.transaction(() => {
      if (role === "teacher") {
        classId = Number(
          db.prepare("INSERT INTO classes (name, form, join_code) VALUES (?, 2, ?)").run(className ?? "My class", newJoinCode()).lastInsertRowid,
        );
      }
      return Number(
        db
          .prepare("INSERT INTO users (email, name, role, class_id, password_hash) VALUES (?, ?, ?, ?, ?)")
          .run(email, name, role, classId, hash).lastInsertRowid,
      );
    })();
    createSession(reply, userId);
    return { ok: true };
  });

  app.post("/api/auth/login", authLimit, async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Enter your email and password." });
    const row = db.prepare("SELECT id, password_hash FROM users WHERE email = ? AND kind = 'user'").get(parsed.data.email) as
      | { id: number; password_hash: string }
      | undefined;
    // Compare against a dummy hash when the user doesn't exist so timing doesn't reveal valid emails.
    const ok = await bcrypt.compare(parsed.data.password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !ok) return reply.code(401).send({ error: "Email or password is incorrect." });
    createSession(reply, row.id);
    return { ok: true };
  });

  // One click for judges: a private copy of the demo class, signed in as the student or the teacher.
  app.post("/api/auth/demo", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = z.object({ role: z.enum(["student", "teacher"]), lang: z.enum(["en", "ms"]).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Choose student or teacher." });
    const { teacherId, heroId } = createDemoClass();
    if (body.data.lang) db.prepare("UPDATE users SET lang = ? WHERE id IN (?, ?)").run(body.data.lang, teacherId, heroId);
    createSession(reply, body.data.role === "teacher" ? teacherId : heroId);
    return { ok: true };
  });

  // Inside a demo class, hop between the student and teacher views to follow the story end to end.
  app.post("/api/auth/demo/switch", { preHandler: requireUser }, async (req, reply) => {
    const u = req.user!;
    if (u.kind !== "demo" || !u.class_id) return reply.code(403).send({ error: "Only available in the demo." });
    const target =
      u.role === "teacher"
        ? (db.prepare("SELECT id FROM users WHERE class_id = ? AND role = 'student' ORDER BY id LIMIT 1").get(u.class_id) as { id: number } | undefined)
        : (db.prepare("SELECT id FROM users WHERE class_id = ? AND role = 'teacher' LIMIT 1").get(u.class_id) as { id: number } | undefined);
    if (!target) return reply.code(404).send({ error: "Demo class not found." });
    db.prepare("UPDATE users SET lang = ? WHERE id = ?").run(u.lang, target.id);
    const token = req.cookies[COOKIE];
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    createSession(reply, target.id);
    return { ok: true, role: u.role === "teacher" ? "student" : "teacher" };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const token = req.cookies[COOKIE];
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });
}

export function cleanupExpired() {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  cleanupDemoClasses();
}
