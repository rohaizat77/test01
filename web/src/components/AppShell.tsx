import { BarChart3, BookOpenCheck, ClipboardCheck, FileText, Home, LogOut, MessageCircleQuestion, NotebookPen, Repeat, Target, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useLang } from "../lib/i18n";
import { useSession } from "../lib/session";
import { Avatar, LangToggle, Logo, Spinner, ThemeSwitch } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  primary?: boolean;
}

export function AppShell({ role }: { role: "student" | "teacher" }) {
  const { user, logout, switchDemo } = useSession();
  const { t } = useLang();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const items: NavItem[] =
    role === "student"
      ? [
          { to: "/s", label: t("Home", "Utama"), icon: Home, end: true },
          { to: "/s/practice", label: t("Practice", "Latihan"), icon: Target },
          { to: "/s/tutor", label: t("Tutor", "Tutor"), icon: MessageCircleQuestion, primary: true },
          { to: "/s/progress", label: t("Progress", "Kemajuan"), icon: BarChart3 },
          { to: "/s/tasks", label: t("Tasks", "Tugasan"), icon: NotebookPen },
        ]
      : [
          { to: "/t", label: t("Class", "Kelas"), icon: Users, end: true },
          { to: "/t/assess", label: t("Assess", "Penilaian"), icon: ClipboardCheck },
          { to: "/t/plan", label: t("Planner", "Perancang"), icon: BookOpenCheck },
          { to: "/t/worksheets", label: t("Worksheets", "Lembaran"), icon: FileText },
        ];
  const sidebarExtra: NavItem[] = role === "student" ? [{ to: "/s/class", label: t("Class board", "Papan kelas"), icon: Trophy }] : [];

  async function doSwitch() {
    setSwitching(true);
    try {
      const next = await switchDemo();
      navigate(next === "teacher" ? "/t" : "/s");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        {t("Skip to content", "Langkau ke kandungan")}
      </a>
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-paper-200 bg-white/70 px-4 py-5 backdrop-blur lg:flex dark:border-white/8 dark:bg-ink-900/60">
        <Logo className="px-2" />
        <p className="mt-1 px-2 text-xs muted">
          {role === "teacher" ? t("Teacher", "Guru") : t("Student", "Murid")} · {user?.className ?? t("No class yet", "Tiada kelas")}
        </p>
        <nav className="mt-6 flex flex-col gap-1" aria-label={t("Main", "Utama")}>
          {[...items, ...sidebarExtra].map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                  isActive ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : "text-ink-800/75 hover:bg-ink-800/5 dark:text-ink-100/75 dark:hover:bg-white/5"
                }`
              }
            >
              <it.icon className="h-5 w-5" /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeSwitch />
          </div>
          {user && (
            <div className="flex items-center gap-2 rounded-2xl bg-paper-100 p-2 dark:bg-white/5">
              <Avatar name={user.name} id={user.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="text-xs muted">{user.isDemo ? t("Demo account", "Akaun demo") : user.email}</p>
              </div>
              <button
                onClick={() => logout().then(() => navigate("/"))}
                className="rounded-full p-2 hover:bg-ink-800/10 dark:hover:bg-white/10"
                title={t("Sign out", "Log keluar")}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">{t("Sign out", "Log keluar")}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile header */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-paper-200 bg-paper-50/90 px-4 py-2.5 backdrop-blur lg:hidden dark:border-white/8 dark:bg-ink-950/90">
          <Logo className="!text-lg" />
          <div className="flex items-center gap-2">
            {role === "student" && (
              <NavLink to="/s/class" className="rounded-full p-2 hover:bg-ink-800/5" title={t("Class board", "Papan kelas")}>
                <Trophy className="h-5 w-5" />
                <span className="sr-only">{t("Class board", "Papan kelas")}</span>
              </NavLink>
            )}
            <LangToggle compact />
            <button onClick={() => logout().then(() => navigate("/"))} className="rounded-full p-2 hover:bg-ink-800/5" title={t("Sign out", "Log keluar")}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">{t("Sign out", "Log keluar")}</span>
            </button>
          </div>
        </header>

        {user?.isDemo && (
          <div className="no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink-800 px-4 py-2 text-center text-xs font-semibold text-white">
            <span>
              {role === "student"
                ? t(`Demo: you're Aiman in class ${user.className}. Your changes are private.`, `Demo: anda Aiman dalam kelas ${user.className}. Perubahan anda peribadi.`)
                : t(`Demo: you're the teacher of ${user.className} (25 students).`, `Demo: anda guru kelas ${user.className} (25 murid).`)}
            </span>
            <button onClick={doSwitch} disabled={switching} className="inline-flex items-center gap-1 rounded-full bg-sun-400 px-3 py-1 font-extrabold text-ink-900 hover:bg-sun-300">
              {switching ? <Spinner className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
              {role === "student" ? t("Switch to teacher view", "Tukar ke paparan guru") : t("Switch to student view", "Tukar ke paparan murid")}
            </button>
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-paper-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden dark:border-white/8 dark:bg-ink-900/95"
          aria-label={t("Main", "Utama")}
        >
          <ul className={`grid ${items.length === 5 ? "grid-cols-5" : "grid-cols-4"} items-end`}>
            {items.map((it) => (
              <li key={it.to} className="flex justify-center">
                <NavLink
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    it.primary
                      ? `-mt-6 flex flex-col items-center gap-1 text-[11px] font-bold ${isActive ? "text-ink-800 dark:text-sun-400" : "text-ink-800/70 dark:text-ink-100/70"}`
                      : `flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold ${isActive ? "text-ink-800 dark:text-sun-400" : "text-ink-800/55 dark:text-ink-100/55"}`
                  }
                >
                  {it.primary ? (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sun-400 text-ink-900 shadow-[0_4px_0_#d48f0a] ring-4 ring-paper-50 dark:ring-ink-950">
                      <it.icon className="h-6 w-6" />
                    </span>
                  ) : (
                    <it.icon className="h-5 w-5" />
                  )}
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
