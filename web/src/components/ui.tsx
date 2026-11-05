import { AlertCircle, Loader2, Moon, Sparkles, Sun, Monitor } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../lib/i18n";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "../lib/theme";
import type { Level } from "../lib/types";

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? "#ffc53d" : "#1b1f4b"} />
        <path d="M14 40c6-14 14-21 22-21 6 0 10 4 10 9 0 7-7 11-15 11" fill="none" stroke={light ? "#1b1f4b" : "#ffc53d"} strokeWidth="6" strokeLinecap="round" />
        <circle cx="46" cy="44" r="5" fill="#ff7a59" />
      </svg>
      <span>
        Cikgu<span className={light ? "text-sun-400" : "text-ink-500 dark:text-sun-400"}>AI</span>
      </span>
    </span>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function PageLoader() {
  const { t } = useLang();
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 muted" role="status">
      <Spinner /> {t("Loading…", "Memuatkan…")}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-coral-400/40 bg-coral-100 p-4 text-sm text-ink-900 dark:bg-coral-500/10 dark:text-ink-100">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-coral-500" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <button className="font-bold text-coral-500 underline" onClick={onRetry}>
          {t("Retry", "Cuba lagi")}
        </button>
      )}
    </div>
  );
}

export function AiOffNotice() {
  const { t } = useLang();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sun-400/50 bg-sun-100 p-4 text-sm dark:bg-sun-400/10">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
      <p>
        {t(
          "AI features aren't switched on for this server yet. Everything else works: adaptive quizzes, mastery tracking and dashboards.",
          "Ciri AI belum diaktifkan pada pelayan ini. Ciri lain berfungsi: kuiz adaptif, penjejakan penguasaan dan papan pemuka.",
        )}
      </p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Stat({ label, value, sub, tone = "ink" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "ink" | "sun" | "coral" | "mint" }) {
  const tones = {
    ink: "text-ink-700 dark:text-ink-300",
    sun: "text-sun-500",
    coral: "text-coral-500",
    mint: "text-mint-500 dark:text-mint-400",
  };
  return (
    <div className="card !p-4">
      <p className="text-xs font-bold uppercase tracking-wider muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs muted">{sub}</p>}
    </div>
  );
}

export const LEVEL_STYLE: Record<Level, { bar: string; pill: string }> = {
  new: { bar: "bg-lvl-new", pill: "bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-100" },
  learning: { bar: "bg-lvl-learning", pill: "bg-coral-100 text-coral-500 dark:bg-coral-500/15" },
  developing: { bar: "bg-lvl-developing", pill: "bg-sun-100 text-[#9a6a00] dark:bg-sun-400/15 dark:text-sun-300" },
  mastered: { bar: "bg-lvl-mastered", pill: "bg-mint-100 text-mint-500 dark:bg-mint-400/15 dark:text-mint-400" },
};

export function levelLabel(level: Level, t: (en: string, ms: string) => string) {
  return {
    new: t("Not started", "Belum mula"),
    learning: t("Learning", "Sedang belajar"),
    developing: t("Developing", "Berkembang"),
    mastered: t("Mastered", "Dikuasai"),
  }[level];
}

export function levelOf(p: number | null, n = 4): Level {
  if (p === null || n === 0) return "new";
  if (p >= 0.9 && n >= 4) return "mastered";
  if (p >= 0.6) return "developing";
  return "learning";
}

export function LevelPill({ level }: { level: Level }) {
  const { t } = useLang();
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[level].pill}`}>{levelLabel(level, t)}</span>;
}

export function MasteryBar({ p, level, className = "" }: { p: number; level: Level; className?: string }) {
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10 ${className}`} role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-700 ${LEVEL_STYLE[level].bar}`} style={{ width: `${Math.max(3, Math.round(p * 100))}%` }} />
    </div>
  );
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-full border border-ink-800/15 p-0.5 text-xs font-extrabold dark:border-white/15" role="group" aria-label="Language / Bahasa">
      {(["en", "ms"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 transition ${lang === l ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : "text-ink-800/70 hover:text-ink-800 dark:text-ink-100/70"}`}
        >
          {l === "en" ? "EN" : "BM"}
        </button>
      ))}
    </div>
  );
}

export function ThemeSwitch() {
  const { t } = useLang();
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice());
  const opts: { v: ThemeChoice; icon: typeof Sun; label: string }[] = [
    { v: "light", icon: Sun, label: t("Light", "Cerah") },
    { v: "system", icon: Monitor, label: t("System", "Sistem") },
    { v: "dark", icon: Moon, label: t("Dark", "Gelap") },
  ];
  return (
    <div className="inline-flex rounded-full border border-ink-800/15 p-0.5 dark:border-white/15" role="group" aria-label={t("Theme", "Tema")}>
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          onClick={() => {
            setChoice(v);
            setThemeChoice(v);
          }}
          aria-pressed={choice === v}
          title={label}
          className={`rounded-full p-1.5 transition ${choice === v ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : "text-ink-800/60 dark:text-ink-100/60"}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="max-w-sm text-sm muted">{children}</div>}
      {action && (
        <Link to={action.to} className="btn-primary mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const AVATAR_COLORS = ["bg-ink-500", "bg-coral-400", "bg-mint-400", "bg-sun-400", "bg-ink-400", "bg-[#b06ee8]", "bg-[#3aa8d8]"];
export function Avatar({ name, id, size = "h-9 w-9 text-sm" }: { name: string; id: number; size?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${size} ${AVATAR_COLORS[id % AVATAR_COLORS.length]}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
