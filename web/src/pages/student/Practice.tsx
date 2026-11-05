import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorNote, LevelPill, MasteryBar, PageHeader, PageLoader } from "../../components/ui";
import { useLang, useSkills } from "../../lib/i18n";
import { reasonText } from "../../lib/meta";
import { useApi } from "../../lib/session";
import type { Progress, PathStep } from "../../lib/types";

export default function Practice() {
  const { t, lang } = useLang();
  const { skills, name, byId } = useSkills();
  const { data, error, reload } = useApi<Progress>(`/api/student/progress?lang=${lang}`);
  const math = useApi<PathStep[]>("/api/student/path?subject=math");
  const sci = useApi<PathStep[]>("/api/student/path?subject=sci");
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("Adaptive practice", "Latihan adaptif")} title={t("What do you want to practise?", "Apa yang anda mahu latih?")} />
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { subj: "math" as const, path: math.data, color: "bg-ink-800 text-white", label: t("Mathematics", "Matematik") },
          { subj: "sci" as const, path: sci.data, color: "bg-coral-400 text-white", label: t("Science", "Sains") },
        ].map(({ subj, path, color, label }) => (
          <Link key={subj} to={`/s/quiz?subject=${subj}`} className={`group relative overflow-hidden rounded-[1.75rem] p-5 ${color} transition hover:-translate-y-0.5`}>
            <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              {t("Smart mix", "Campuran pintar")}
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">{label}</h2>
            <p className="mt-1 text-sm opacity-85">
              {path?.[0]
                ? t(`Starts with ${name(path[0].skill)}: ${reasonText(path[0].reasons[0], t, name).toLowerCase()}`, `Bermula dengan ${name(path[0].skill)}: ${reasonText(path[0].reasons[0], t, name).toLowerCase()}`)
                : t("5 questions picked for you", "5 soalan dipilih untuk anda")}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold">
              {t("Start 5 questions", "Mula 5 soalan")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {(["math", "sci"] as const).map((subj) => (
        <section key={subj}>
          <h2 className="mb-2 text-lg font-extrabold">{subj === "math" ? t("Maths topics", "Topik Matematik") : t("Science topics", "Topik Sains")}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {skills
              .filter((s) => s.subject === subj)
              .map((s) => {
                const m = data.mastery.find((x) => x.skill === s.id)!;
                return (
                  <li key={s.id}>
                    <Link to={`/s/quiz?skill=${s.id}`} className="card block !p-4 transition hover:border-ink-400">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold muted">
                            {t("Chapter", "Bab")} {byId.get(s.id)?.chapter}
                          </p>
                          <p className="font-bold leading-tight">{name(s.id)}</p>
                        </div>
                        <LevelPill level={m.level} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs muted">{lang === "ms" ? s.blurb.ms : s.blurb.en}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <MasteryBar p={m.pKnown} level={m.level} className="!h-2" />
                        <span className="w-9 text-right text-xs font-bold">{Math.round(m.pKnown * 100)}%</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
