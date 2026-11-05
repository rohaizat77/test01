import { ArrowLeft, Check, ShieldCheck, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MasteryHistory } from "../../components/charts";
import { MathText } from "../../components/MathText";
import { Avatar, ErrorNote, LevelPill, MasteryBar, PageLoader, Stat } from "../../components/ui";
import { fmt } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi } from "../../lib/session";
import type { Badge, MasteryItem, XpSummary } from "../../lib/types";

interface Detail {
  student: { id: number; name: string };
  mastery: MasteryItem[];
  history: { day: string; math: number; sci: number }[];
  xp: XpSummary;
  badges: Badge[];
  recent: { id: number; skill: string; correct: boolean; misconception: string | null; pAfter: number; date: string; stem: string }[];
  misconceptions: { label: string | null; count: number }[];
  tutorUse: { skill: string | null; n: number }[];
}

export default function StudentDetail() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { name } = useSkills();
  const { data, error, reload } = useApi<Detail>(`/api/teacher/students/${id}?lang=${lang}`);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  const mastered = data.mastery.filter((m) => m.level === "mastered").length;
  const weakest = [...data.mastery].filter((m) => m.attempts > 0).sort((a, b) => a.pKnown - b.pKnown).slice(0, 3);

  return (
    <div className="space-y-5">
      <Link to="/t" className="inline-flex items-center gap-1 text-sm font-bold muted hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t("Class", "Kelas")}
      </Link>
      <div className="flex items-center gap-4">
        <Avatar name={data.student.name} id={data.student.id} size="h-14 w-14 text-lg" />
        <div>
          <h1 className="text-2xl font-extrabold">{data.student.name}</h1>
          <p className="text-sm muted">
            {t("Weakest:", "Paling lemah:")} {weakest.map((w) => `${name(w.skill)} (${fmt.pct(w.pKnown)})`).join(", ")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("Topics mastered", "Topik dikuasai")} value={`${mastered}/${data.mastery.length}`} tone="mint" />
        <Stat label={t("XP this week", "XP minggu ini")} value={data.xp.week} tone="sun" />
        <Stat label={t("Streak", "Rentetan")} value={`${data.xp.streak} ${t("days", "hari")}`} tone="coral" />
        <Stat label={t("Badges", "Lencana")} value={`${data.badges.filter((b) => b.earned).length}/${data.badges.length}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-extrabold">{t("Mastery by topic", "Penguasaan mengikut topik")}</h2>
          <ul className="mt-3 space-y-2.5">
            {data.mastery.map((m) => (
              <li key={m.skill}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{name(m.skill)}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="muted">
                      {m.attempts} {t("answers", "jawapan")}
                      {m.accuracy !== null && `, ${m.accuracy}%`}
                    </span>
                    <LevelPill level={m.level} />
                  </span>
                </div>
                <MasteryBar p={m.pKnown} level={m.level} className="mt-1 !h-2" />
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <section className="card">
            <h2 className="text-lg font-extrabold">{t("Mastery over 6 weeks", "Penguasaan dalam 6 minggu")}</h2>
            <MasteryHistory history={data.history} />
          </section>
          <section className="card">
            <h2 className="text-lg font-extrabold">{t("Repeated misconceptions", "Salah faham berulang")}</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {data.misconceptions.length === 0 && <li className="muted">{t("None detected.", "Tiada dikesan.")}</li>}
              {data.misconceptions.map((m, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{m.label}</span>
                  <span className="font-bold">×{m.count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <ShieldCheck className="h-5 w-5 text-mint-500" /> {t("Tutor use", "Penggunaan tutor")}
            </h2>
            <p className="text-xs muted">{t("You see topics and counts, not the conversations: students can ask freely.", "Anda nampak topik dan bilangan, bukan perbualan: murid bebas bertanya.")}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
              {data.tutorUse.length === 0 && <li className="muted">{t("Hasn't used the tutor yet.", "Belum menggunakan tutor.")}</li>}
              {data.tutorUse.map((u, i) => (
                <li key={i} className="chip !text-xs">
                  {u.skill ? name(u.skill) : t("General", "Umum")}: {u.n}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="card">
        <h2 className="text-lg font-extrabold">{t("Recent answers", "Jawapan terkini")}</h2>
        <ul className="mt-2 divide-y divide-paper-200 dark:divide-white/8">
          {data.recent.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${r.correct ? "bg-mint-100 text-mint-500 dark:bg-mint-400/15" : "bg-coral-100 text-coral-500 dark:bg-coral-500/15"}`}>
                {r.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <MathText text={r.stem} />
                <p className="text-xs muted">
                  {name(r.skill)} · {fmt.date(r.date, lang)} · {t("mastery now", "penguasaan kini")} {fmt.pct(r.pAfter)}
                  {r.misconception && <span className="text-coral-500"> · {r.misconception}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
