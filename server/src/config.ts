import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const config = {
  port: Number(process.env.PORT ?? 3400),
  host: process.env.HOST ?? "127.0.0.1",
  dbPath: process.env.DB_PATH ?? "./data/cikguai.db",
  uploadDir: process.env.UPLOAD_DIR ?? "",
  publicOrigin: process.env.PUBLIC_ORIGIN ?? "http://localhost:5173",
  model: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
  isProd: process.env.NODE_ENV === "production",
  webDist: process.env.WEB_DIST ?? "./web/dist",
  // Read once at startup; the key itself is never logged or returned.
  hasAiKey: Boolean(process.env.ANTHROPIC_API_KEY),
};
