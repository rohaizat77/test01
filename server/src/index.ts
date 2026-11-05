import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import "./db.js";
import { authRoutes, cleanupExpired, loadUser } from "./auth.js";
import { ensureBank } from "./learning.js";
import { cleanupOrphanUploads } from "./uploads.js";
import { studentRoutes } from "./routes/student.js";
import { tutorRoutes } from "./routes/tutor.js";
import { assessmentRoutes } from "./routes/assessment.js";
import { teacherRoutes } from "./routes/teacher.js";
import { plannerRoutes } from "./routes/planner.js";
import { contentRoutes } from "./routes/content.js";

const app = Fastify({
  trustProxy: "127.0.0.1",
  bodyLimit: 256 * 1024,
  logger: {
    level: config.isProd ? "info" : "debug",
    // Never log cookies or auth headers.
    redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
  },
});

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // KaTeX positions glyphs with inline styles
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: false } : false,
});
await app.register(cors, { origin: [config.publicOrigin], credentials: true });
await app.register(cookie);
await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({ statusCode: 429, error: "Too many requests — please slow down and try again in a minute." }),
});
await app.register(multipart, { limits: { fileSize: 6 * 1024 * 1024, files: 1, fields: 6, fieldSize: 8 * 1024 } });

// Reject cross-site state-changing requests (defence in depth on top of SameSite cookies).
app.addHook("onRequest", async (req, reply) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const origin = req.headers.origin;
  if (origin && origin !== config.publicOrigin) return reply.code(403).send({ error: "Cross-origin request blocked." });
});
app.addHook("preHandler", loadUser);

app.get("/api/health", async () => ({ ok: true, ai: config.hasAiKey, model: config.model }));
await app.register(authRoutes);
await app.register(contentRoutes);
await app.register(studentRoutes);
await app.register(tutorRoutes);
await app.register(assessmentRoutes);
await app.register(teacherRoutes);
await app.register(plannerRoutes);

const webDist = path.resolve(config.webDist);
if (fs.existsSync(webDist)) {
  await app.register(fastifyStatic, {
    root: webDist,
    wildcard: false,
    setHeaders(res, filePath) {
      const value = filePath.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache";
      res.header("Cache-Control", value);
    },
  });
}

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api/") || req.method !== "GET" || !fs.existsSync(webDist)) {
    return reply.code(404).send({ error: "Not found." });
  }
  // Client-side routes fall back to the SPA shell.
  return reply.header("Cache-Control", "no-cache").sendFile("index.html");
});

app.setErrorHandler((error, req, reply) => {
  const err = error as { statusCode?: number; code?: string; name?: string; message?: string; validation?: unknown };
  if (err.code === "FST_REQ_FILE_TOO_LARGE") return reply.code(413).send({ error: "That photo is too large. Please use one under 6 MB." });
  if (err.validation || err.name === "ZodError") return reply.code(400).send({ error: "Some of the details sent were not valid." });
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  if (status >= 500) req.log.error(error);
  reply.code(status).send({ error: status >= 500 ? "Something went wrong on our side. Please try again." : err.message });
});

ensureBank();
cleanupExpired();
cleanupOrphanUploads();
setInterval(() => {
  cleanupExpired();
  cleanupOrphanUploads();
}, 3600_000).unref();

await app.listen({ port: config.port, host: config.host });
app.log.info({ ai: config.hasAiKey, model: config.model }, "CikguAI ready");
