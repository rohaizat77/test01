import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
export const UPLOAD_DIR = path.resolve(config.uploadDir || path.join(path.dirname(config.dbPath), "uploads"));
fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o750 });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  form        INTEGER NOT NULL DEFAULT 2,
  join_code   TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'real' CHECK (kind IN ('real','demo')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','teacher')),
  kind          TEXT NOT NULL DEFAULT 'user' CHECK (kind IN ('user','demo')),
  class_id      INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  password_hash TEXT,
  lang          TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en','ms')),
  daily_goal    INTEGER NOT NULL DEFAULT 50,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id, role);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT UNIQUE,
  skill          TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('mcq','num')),
  difficulty     REAL NOT NULL DEFAULT 0,
  stem_en        TEXT NOT NULL,
  stem_ms        TEXT NOT NULL,
  choices_json   TEXT,
  answer         TEXT NOT NULL,
  explanation_en TEXT NOT NULL,
  explanation_ms TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  n_attempts     INTEGER NOT NULL DEFAULT 0,
  n_correct      INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_questions_skill ON questions(skill, status);

CREATE TABLE IF NOT EXISTS mastery (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill     TEXT NOT NULL,
  p_known   REAL NOT NULL,
  theta     REAL NOT NULL DEFAULT 0,
  n         INTEGER NOT NULL DEFAULT 0,
  n_correct INTEGER NOT NULL DEFAULT 0,
  last_at   TEXT,
  PRIMARY KEY (user_id, skill)
);

CREATE TABLE IF NOT EXISTS attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  skill        TEXT NOT NULL,
  correct      INTEGER NOT NULL,
  response     TEXT NOT NULL,
  misconception TEXT,
  p_before     REAL NOT NULL,
  p_after      REAL NOT NULL,
  session      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_skill ON attempts(skill, created_at);

CREATE TABLE IF NOT EXISTS xp_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  day        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_user_day ON xp_events(user_id, day);

CREATE TABLE IF NOT EXISTS tutor_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  image      TEXT,
  skill      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tutor_user ON tutor_messages(user_id, id);

CREATE TABLE IF NOT EXISTS assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  skill       TEXT,
  prompt      TEXT NOT NULL,
  rubric_json TEXT NOT NULL,
  max_score   INTEGER NOT NULL,
  due_date    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text     TEXT,
  image           TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','ai_graded','approved')),
  ai_json         TEXT,
  ai_score        REAL,
  ai_confidence   REAL,
  final_score     REAL,
  final_json      TEXT,
  teacher_note    TEXT,
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  graded_at       TEXT,
  approved_at     TEXT,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS lesson_plans (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill        TEXT NOT NULL,
  title        TEXT NOT NULL,
  params_json  TEXT NOT NULL,
  plan_json    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS class_summaries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lang       TEXT NOT NULL,
  json       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Malaysia is UTC+8 all year; days are stored as local calendar dates.
export function todayMY(offsetDays = 0): string {
  const d = new Date(Date.now() + 8 * 3600_000 + offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// SQLite datetime string (UTC) for "n days ago, at a given Malaysia-local hour".
export function sqliteTimeAgo(daysAgo: number, hourMY: number, minute = 0): string {
  const day = todayMY(-daysAgo);
  const utc = new Date(`${day}T00:00:00Z`).getTime() + (hourMY - 8) * 3600_000 + minute * 60_000;
  return new Date(utc).toISOString().replace("T", " ").slice(0, 19);
}

// Malaysia-local date for a stored UTC datetime.
export function toMYDate(sqliteUtc: string): string {
  return new Date(new Date(`${sqliteUtc.replace(" ", "T")}Z`).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
