import { ArrowRight, Flame, MessageCircleQuestion, NotebookPen, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { GoalRing } from "../../components/charts";
import { ErrorNote, LevelPill, MasteryBar, PageLoader } from "../../components/ui";
import { useLang, useSkills } from "../../lib/i18n";
import { BADGE_META, greeting, reasonText } from "../../lib/meta";
import { useApi } from "../../lib/session";
import type { StudentHome } from "../../lib/types";

export default function Home() {
  const { t, lang } = useLang();
  const { name, byId } = useSkills();
  const { data, error, reload } = useApi<StudentHome>(`/api/student/home?lang=${lang}`);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  const first = data.name.split(" ")[0];
  const goalMet = data.xp.today >= data.dailyGoal;

  return (
    <div className="space-y-6">
      <section className="grid-paper relative overflow-hidden rounded-[2rem] border border-paper-200 bg-white p-5 sm:p-7 dark:border-white/8 dark:bg-ink-900">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow">{greeting(t)}</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{first}!</h1>
            <p className="mt-2 max-w-md muted">
              {goalMet
                ? t("Daily goal done. Great work, keep the streak going tomorrow.", "Matlamat harian tercapai. Syabas, teruskan rentetan esok.")
                : t(
                    `${data.dailyGoal - data.xp.today} XP to reach today's goal. One short quiz will do it.`,
                    `${data.dailyGoal - data.xp.today} XP lagi untuk matlamat hari ini. Satu kuiz pendek sudah cukup.`,
                  )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip !border-coral-400/30 !bg-coral-100 !text-coral-500 dark:!bg-coral-500/15">
                <Flame className="h-4 w-4" /> {data.xp.streak} {t("day streak", "hari berturut")}
              </span>
              <Link to="/s/class" className="chip">
                <Trophy className="h-4 w-4 text-sun-500" /> #{data.rank ?? "–"} {t(`of ${data.classSize} this week`, `daripada ${data.classSize} minggu ini`)}
              </Link>
              <span className="chip">{data.xp.week} XP {t("this week", "minggu ini")}</span>
            </div>
          </div>
          <GoalRing value={data.xp.today} goal={data.dailyGoal} />
        </div>
      </section>

      {data.pendingAssignments > 0 && (
        <Link to="/s/tasks" className="card flex items-center gap-3 !py-4 transition hover:border-ink-400">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sun-100 text-sun-500 dark:bg-sun-400/15">
            <NotebookPen className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-bold">
              {t(`${data.pendingAssignments} task from your teacher`, `${data.pendingAssignments} tugasan daripada guru`)}
            </p>
            <p className="text-sm muted">{t("Type your answer or snap a photo of your working.", "Taip jawapan atau ambil gambar jalan kerja anda.")}</p>
          </div>
          <ArrowRight className="h-5 w-5 muted" />
        </Link>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{t("Your learning path", "Laluan pembelajaran anda")}</p>
            <h2 className="text-xl font-extrabold">{t("Your next 3 things to study", "3 perkara seterusnya untuk dipelajari")}</h2>
          </div>
          <Link to="/s/practice" className="shrink-0 whitespace-nowrap text-sm font-bold text-ink-500 dark:text-sun-400">
            {t("All topics", "Semua topik")}
          </Link>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {data.path.map((step, i) => {
            const m = data.mastery.find((x) => x.skill === step.skill)!;
            const skill = byId.get(step.skill);
            return (
              <li key={step.skill} className="card rise flex flex-col !p-4" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold ${i === 0 ? "bg-sun-400 text-ink-900" : "bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-100"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold muted">
                      {skill?.subject === "math" ? t("Maths", "Matematik") : t("Science", "Sains")} · {t("Ch.", "Bab")} {skill?.chapter}
                    </p>
                    <h3 className="font-display text-lg font-bold leading-tight">{name(step.skill)}</h3>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <MasteryBar p={m.pKnown} level={m.level} />
                  <span className="w-10 text-right text-sm font-bold">{Math.round(m.pKnown * 100)}%</span>
                </div>
                <ul className="mt-3 flex-1 space-y-1 text-sm muted">
                  {step.reasons.slice(0, 3).map((r, j) => (
                    <li key={j}>• {reasonText(r, t, name)}</li>
                  ))}
                </ul>
                <Link to={`/s/quiz?skill=${step.skill}`} className={`${i === 0 ? "btn-sun" : "btn-ghost"} mt-4 w-full`}>
                  {t("Practise now", "Berlatih sekarang")} <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <h2 className="text-lg font-extrabold">{t("Mastery by topic", "Penguasaan mengikut topik")}</h2>
          <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {(["math", "sci"] as const).map((subj) => (
              <div key={subj}>
                <p className="mb-1 mt-2 text-xs font-extrabold uppercase tracking-wider muted">{subj === "math" ? t("Mathematics", "Matematik") : t("Science", "Sains")}</p>
                <ul className="space-y-2.5">
                  {data.mastery
                    .filter((m) => m.subject === subj)
                    .map((m) => (
                      <li key={m.skill}>
                        <Link to={`/s/quiz?skill=${m.skill}`} className="group block">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-semibold group-hover:underline">{name(m.skill)}</span>
                            <LevelPill level={m.level} />
                          </div>
                          <MasteryBar p={m.pKnown} level={m.level} className="mt-1 !h-2" />
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Link to="/s/tutor" className="card flex items-center gap-4 !bg-ink-800 !text-white transition hover:!bg-ink-700 dark:!bg-ink-700">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-400 text-ink-900">
              <MessageCircleQuestion className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">{t("Stuck? Ask CikguAI", "Buntu? Tanya CikguAI")}</p>
              <p className="text-sm text-white/70">{t("Hints, not answers. Snap a photo of your working.", "Petunjuk, bukan jawapan. Ambil gambar jalan kerja anda.")}</p>
            </div>
          </Link>
          <div className="card">
            <h2 className="text-lg font-extrabold">{t("Badges", "Lencana")}</h2>
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {data.badges.map((b) => {
                const meta = BADGE_META[b.id];
                const Icon = meta.icon;
                return (
                  <li key={b.id} className="flex flex-col items-center gap-1 text-center" title={lang === "ms" ? meta.hintMs : meta.hintEn}>
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${b.earned ? "bg-sun-400 text-ink-900" : "bg-ink-100 text-ink-300 dark:bg-white/5 dark:text-white/25"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`text-[10.5px] font-bold leading-tight ${b.earned ? "" : "muted"}`}>{lang === "ms" ? meta.ms : meta.en}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
