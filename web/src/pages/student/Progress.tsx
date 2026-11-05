import { MasteryHistory, MasteryRadar } from "../../components/charts";
import { ErrorNote, LevelPill, PageHeader, PageLoader, Stat } from "../../components/ui";
import { fmt } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi } from "../../lib/session";
import type { Progress as P } from "../../lib/types";

export default function Progress() {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const { data, error, reload } = useApi<P>(`/api/student/progress?lang=${lang}`);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  const mastered = data.mastery.filter((m) => m.level === "mastered").length;
  const first = data.history[0];
  const last = data.history[data.history.length - 1];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("Progress", "Kemajuan")} title={t("How you're growing", "Perkembangan anda")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("Topics mastered", "Topik dikuasai")} value={`${mastered}/${data.mastery.length}`} tone="mint" />
        <Stat label={t("Total XP", "Jumlah XP")} value={fmt.num(data.xp.total)} tone="sun" />
        <Stat label={t("Streak", "Rentetan")} value={`${data.xp.streak} ${t("days", "hari")}`} tone="coral" />
        <Stat
          label={t("Maths, 6 weeks", "Matematik, 6 minggu")}
          value={`${last.math - first.math >= 0 ? "+" : ""}${Math.round(last.math - first.math)} pts`}
          sub={`${Math.round(first.math)}% → ${Math.round(last.math)}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["math", "sci"] as const).map((subj) => (
          <div key={subj} className="card">
            <h2 className="text-lg font-extrabold">{subj === "math" ? t("Maths mastery map", "Peta penguasaan Matematik") : t("Science mastery map", "Peta penguasaan Sains")}</h2>
            <MasteryRadar mastery={data.mastery} subject={subj} />
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-extrabold">{t("Average mastery over time", "Purata penguasaan dari semasa ke semasa")}</h2>
        <p className="text-sm muted">{t("Estimated by the knowledge-tracing model after every answer.", "Dianggarkan oleh model penjejakan pengetahuan selepas setiap jawapan.")}</p>
        <MasteryHistory history={data.history} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-extrabold">{t("Every topic", "Setiap topik")}</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs muted">
              <tr>
                <th className="py-1.5 font-bold">{t("Topic", "Topik")}</th>
                <th className="font-bold">{t("Mastery", "Penguasaan")}</th>
                <th className="font-bold">{t("Answers", "Jawapan")}</th>
                <th className="font-bold">{t("Correct", "Betul")}</th>
              </tr>
            </thead>
            <tbody>
              {data.mastery.map((m) => (
                <tr key={m.skill} className="border-t border-paper-200 dark:border-white/8">
                  <td className="py-2 pr-2 font-semibold">{name(m.skill)}</td>
                  <td>
                    <LevelPill level={m.level} /> <span className="ml-1 text-xs font-bold">{Math.round(m.pKnown * 100)}%</span>
                  </td>
                  <td>{m.attempts}</td>
                  <td>{m.accuracy === null ? "–" : `${m.accuracy}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="text-lg font-extrabold">{t("Recent quizzes", "Kuiz terkini")}</h2>
          <ul className="mt-2 divide-y divide-paper-200 dark:divide-white/8">
            {data.quizzes.map((q, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-10 w-12 items-center justify-center rounded-xl font-display font-extrabold ${q.correct / q.n >= 0.8 ? "bg-mint-100 text-mint-500 dark:bg-mint-400/15" : q.correct / q.n >= 0.5 ? "bg-sun-100 text-[#9a6a00] dark:bg-sun-400/15 dark:text-sun-300" : "bg-coral-100 text-coral-500 dark:bg-coral-500/15"}`}
                >
                  {q.correct}/{q.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.skills.map(name).join(", ")}</p>
                  <p className="text-xs muted">{fmt.date(q.date, lang)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
