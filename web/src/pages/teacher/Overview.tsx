import { AlertTriangle, ArrowRight, BookOpenCheck, Lightbulb, RefreshCw, Sparkles, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AiOffNotice, Avatar, ErrorNote, PageHeader, PageLoader, Spinner, Stat } from "../../components/ui";
import { api, fmt } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi, useSession } from "../../lib/session";
import type { ClassSummary, Overview as O, SubjectId } from "../../lib/types";

function cellColor(p: number | null) {
  if (p === null) return "bg-ink-100/60 text-ink-900/30 dark:bg-white/5 dark:text-white/25";
  if (p >= 0.9) return "bg-mint-400 text-white";
  if (p >= 0.75) return "bg-mint-400/60 text-ink-900";
  if (p >= 0.6) return "bg-sun-400/80 text-ink-900";
  if (p >= 0.4) return "bg-coral-400/60 text-ink-900";
  return "bg-coral-500 text-white";
}

export default function Overview() {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const { data, error, reload } = useApi<O>(`/api/teacher/overview?lang=${lang}`);
  const [subject, setSubject] = useState<SubjectId>("math");
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  const skills = data.skills.filter((s) => s.subject === subject);
  const risky = data.students.filter((s) => s.risk.level !== "ok").sort((a, b) => (a.risk.level === "high" ? -1 : 1) - (b.risk.level === "high" ? -1 : 1));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("Class insights", "Analisis kelas")} title={`${data.className}`}>
        {data.joinCode && (
          <span className="chip">
            {t("Join code", "Kod sertai")}: <strong>{data.joinCode}</strong>
          </span>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("Students", "Murid")} value={data.totals.students} sub={t(`${data.totals.activeThisWeek} active this week`, `${data.totals.activeThisWeek} aktif minggu ini`)} />
        <Stat label={t("Average mastery", "Purata penguasaan")} value={fmt.pct(data.totals.avgMastery)} tone="mint" sub={t("across topics started", "bagi topik yang dimulakan")} />
        <Stat label={t("Answers, 14 days", "Jawapan, 14 hari")} value={fmt.num(data.totals.attempts14)} tone="sun" />
        <Stat label={t("Need attention", "Perlu perhatian")} value={data.totals.atRisk + data.totals.watch} tone="coral" sub={t(`${data.totals.atRisk} high priority`, `${data.totals.atRisk} keutamaan tinggi`)} />
      </div>

      <WeeklySummary />

      <section className="card !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{t("Mastery heatmap", "Peta haba penguasaan")}</h2>
            <p className="text-sm muted">{t("Each cell is the model's estimate that a student has mastered a topic. Click a student for detail.", "Setiap sel ialah anggaran model bahawa murid telah menguasai topik. Klik nama murid untuk butiran.")}</p>
          </div>
          <div className="inline-flex rounded-full border border-ink-800/15 p-0.5 text-sm font-bold dark:border-white/15" role="group">
            {(["math", "sci"] as const).map((s) => (
              <button key={s} onClick={() => setSubject(s)} aria-pressed={subject === s} className={`rounded-full px-3 py-1 ${subject === s ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : ""}`}>
                {s === "math" ? t("Maths", "Matematik") : t("Science", "Sains")}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto px-2 pb-4">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left font-bold dark:bg-ink-900"><span className="sr-only">{t("Student", "Murid")}</span></th>
                {skills.map((s) => (
                  <th key={s.skill} className="w-[11%] px-1 pb-1 align-bottom font-bold leading-tight">
                    {name(s.skill)}
                    <span className="mt-0.5 block font-semibold muted">{s.avg === null ? "–" : fmt.pct(s.avg)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map((st) => (
                <tr key={st.id}>
                  <th scope="row" className="sticky left-0 z-10 bg-white pr-2 text-left font-semibold dark:bg-ink-900">
                    <Link to={`/t/students/${st.id}`} className="flex items-center gap-2 whitespace-nowrap hover:underline">
                      {st.risk.level === "high" && <AlertTriangle className="h-3.5 w-3.5 text-coral-500" aria-label={t("At risk", "Berisiko")} />}
                      {st.name}
                    </Link>
                  </th>
                  {skills.map((s) => {
                    const p = st.mastery[s.skill];
                    return (
                      <td key={s.skill} className={`h-8 rounded-lg text-center font-bold ${cellColor(p)}`} title={`${st.name} · ${name(s.skill)}: ${p === null ? t("not started", "belum mula") : fmt.pct(p)}`}>
                        {p === null ? "·" : Math.round(p * 100)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap items-center gap-3 px-3 text-xs muted">
            {[
              [null, t("Not started", "Belum mula")],
              [0.2, "< 40%"],
              [0.5, "40–59%"],
              [0.65, "60–74%"],
              [0.8, "75–89%"],
              [0.95, "≥ 90%"],
            ].map(([p, l]) => (
              <span key={String(l)} className="flex items-center gap-1">
                <span className={`inline-block h-3 w-5 rounded ${cellColor(p as number | null)}`} /> {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Lightbulb className="h-5 w-5 text-sun-500" /> {t("Common misconceptions", "Salah faham biasa")}
          </h2>
          <p className="text-sm muted">{t("Detected from wrong answer choices, repeated 3+ times by a student in 30 days.", "Dikesan daripada pilihan jawapan salah, diulang 3+ kali oleh murid dalam 30 hari.")}</p>
          <ul className="mt-3 space-y-3">
            {data.misconceptions.length === 0 && <li className="text-sm muted">{t("No repeated misconceptions yet.", "Tiada salah faham berulang lagi.")}</li>}
            {data.misconceptions.map((m) => (
              <li key={m.id} className="rounded-2xl border border-paper-200 p-3 dark:border-white/8">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold leading-snug">{lang === "ms" ? m.label.ms : m.label.en}</p>
                    <p className="text-xs muted">
                      {name(m.skill)} · {t(`${m.students.length} students, ${m.count} wrong answers`, `${m.students.length} murid, ${m.count} jawapan salah`)}
                    </p>
                  </div>
                  <Link to={`/t/plan?skill=${m.skill}`} className="chip shrink-0 !px-2.5 !py-1 !text-xs">
                    <BookOpenCheck className="h-3.5 w-3.5" /> {t("Plan lesson", "Rancang")}
                  </Link>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.students.map((s) => (
                    <Link key={s.id} to={`/t/students/${s.id}`} className="rounded-full bg-paper-100 px-2 py-0.5 text-xs font-semibold hover:underline dark:bg-white/5">
                      {s.name.split(" ")[0]}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="card">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <AlertTriangle className="h-5 w-5 text-coral-500" /> {t("Students needing attention", "Murid yang perlu perhatian")}
            </h2>
            <ul className="mt-2 divide-y divide-paper-200 dark:divide-white/8">
              {risky.length === 0 && <li className="py-2 text-sm muted">{t("Everyone's on track.", "Semua murid di landasan.")}</li>}
              {risky.map((s) => (
                <li key={s.id}>
                  <Link to={`/t/students/${s.id}`} className="flex items-center gap-3 py-2.5 hover:underline">
                    <Avatar name={s.name} id={s.id} size="h-8 w-8 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.name}</p>
                      <p className="text-xs muted">
                        {s.risk.reasons
                          .map((r) =>
                            r === "inactive"
                              ? s.daysInactive === null
                                ? t("never practised", "belum pernah berlatih")
                                : t(`inactive ${s.daysInactive} days`, `tidak aktif ${s.daysInactive} hari`)
                              : r === "low_mastery"
                                ? t(`avg mastery ${fmt.pct(s.avgMastery)}`, `purata penguasaan ${fmt.pct(s.avgMastery)}`)
                                : r === "low_accuracy"
                                  ? t(`${s.accuracy14}% correct lately`, `${s.accuracy14}% betul kebelakangan ini`)
                                  : t("mastery falling", "penguasaan menurun"),
                          )
                          .join(" · ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.risk.level === "high" ? "bg-coral-100 text-coral-500 dark:bg-coral-500/15" : "bg-sun-100 text-[#9a6a00] dark:bg-sun-400/15 dark:text-sun-300"}`}>
                      {s.risk.level === "high" ? t("High", "Tinggi") : t("Watch", "Pantau")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Users className="h-5 w-5 text-ink-500" /> {t("Suggested groups", "Cadangan kumpulan")}
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              {data.skills
                .filter((s) => s.struggling.length >= 3)
                .sort((a, b) => b.struggling.length - a.struggling.length)
                .slice(0, 4)
                .map((s) => (
                  <li key={s.skill} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">
                        {name(s.skill)}: {t(`${s.struggling.length} below 50%`, `${s.struggling.length} di bawah 50%`)}
                      </p>
                      <p className="text-xs muted">{s.struggling.map((x) => x.name.split(" ")[0]).join(", ")}</p>
                    </div>
                    <Link to={`/t/plan?skill=${s.skill}`} className="shrink-0 text-xs font-bold text-ink-500 dark:text-sun-400">
                      {t("Plan", "Rancang")} <ArrowRight className="inline h-3 w-3" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
          <section className="card">
            <h2 className="text-lg font-extrabold">{t("Practice activity, 14 days", "Aktiviti latihan, 14 hari")}</h2>
            <div className="h-28">
              <ResponsiveContainer>
                <BarChart data={data.activity}>
                  <XAxis dataKey="day" tickFormatter={(d: string) => fmt.date(d, lang)} tick={{ fontSize: 10 }} minTickGap={20} />
                  <Tooltip labelFormatter={(d) => fmt.date(String(d), lang)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="attempts" name={t("Answers", "Jawapan")} fill="#5560d8" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WeeklySummary() {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const { aiEnabled } = useSession();
  const [state, setState] = useState<{ summary: ClassSummary | null; createdAt: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(null);
    api<{ summary: ClassSummary | null; createdAt: string | null }>(`/api/teacher/summary?lang=${lang}`).then(setState, () => setState({ summary: null, createdAt: null }));
  }, [lang]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      setState(await api(`/api/teacher/summary?lang=${lang}`, { method: "POST", json: {} }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const s = state?.summary;
  return (
    <section className="card relative overflow-hidden !border-ink-300/50 bg-gradient-to-br from-white to-ink-100/50 dark:!border-white/10 dark:from-ink-900 dark:to-ink-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> {t("AI weekly summary", "Ringkasan mingguan AI")}
          </p>
          <h2 className="mt-1 text-lg font-extrabold">{s ? s.headline : t("What should I focus on next week?", "Apa fokus saya minggu depan?")}</h2>
        </div>
        {aiEnabled && (
          <button onClick={generate} disabled={busy} className={s ? "btn-ghost !py-2 !text-xs" : "btn-sun"}>
            {busy ? <Spinner className="h-4 w-4" /> : s ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-4 w-4" />}
            {busy ? t("Analysing class…", "Menganalisis kelas…") : s ? t("Refresh", "Kemas kini") : t("Generate summary", "Jana ringkasan")}
          </button>
        )}
      </div>
      {!aiEnabled && (
        <div className="mt-3">
          <AiOffNotice />
        </div>
      )}
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
      {!s && aiEnabled && !busy && (
        <p className="mt-2 text-sm muted">
          {t(
            "CikguAI reads the class data above (students are anonymised before anything leaves the server) and suggests interventions you can run tomorrow.",
            "CikguAI membaca data kelas di atas (nama murid dianonimkan sebelum dihantar) dan mencadangkan intervensi yang boleh dijalankan esok.",
          )}
        </p>
      )}
      {s && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-mint-500">{t("Going well", "Berjalan baik")}</p>
              <ul className="mt-1 space-y-1 text-sm">
                {s.wins.map((w, i) => (
                  <li key={i}>✓ {w}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-coral-500">{t("Concerns", "Kebimbangan")}</p>
              <ul className="mt-1 space-y-2 text-sm">
                {s.concerns.map((c, i) => (
                  <li key={i}>
                    <p className="font-bold">{c.title}</p>
                    <p className="muted">{c.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
            {s.shoutouts.length > 0 && (
              <p className="flex flex-wrap items-center gap-1 text-sm">
                <Star className="h-4 w-4 text-sun-500" /> <strong>{t("Shout-outs:", "Pujian:")}</strong> {s.shoutouts.map((x) => x.name.split(" ")[0]).join(", ")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-500 dark:text-sun-400">{t("Suggested interventions", "Cadangan intervensi")}</p>
            <ul className="mt-1 space-y-2">
              {s.interventions.map((iv, i) => (
                <li key={i} className="rounded-2xl bg-white p-3 text-sm dark:bg-white/5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold">{iv.title}</p>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold dark:bg-white/10">{iv.minutes} min</span>
                  </div>
                  <p className="mt-1 muted">{iv.activity}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {iv.students.map((st) => (
                      <Link key={st.id} to={`/t/students/${st.id}`} className="rounded-full bg-paper-100 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">
                        {st.name.split(" ")[0]}
                      </Link>
                    ))}
                    {iv.skill && (
                      <Link to={`/t/plan?skill=${iv.skill}`} className="ml-auto text-xs font-bold text-ink-500 dark:text-sun-400">
                        {t(`Plan a lesson on ${name(iv.skill)}`, `Rancang pelajaran ${name(iv.skill)}`)} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {state?.createdAt && s && <p className="mt-3 text-xs muted">{t("Generated", "Dijana")} {new Date(state.createdAt.includes("T") ? state.createdAt : `${state.createdAt.replace(" ", "T")}Z`).toLocaleString(lang === "ms" ? "ms-MY" : "en-MY")}</p>}
    </section>
  );
}
