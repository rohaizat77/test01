import { ArrowRight, BookOpenCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AiOffNotice, ErrorNote, PageHeader, Spinner } from "../../components/ui";
import { api, fmt } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi, useSession } from "../../lib/session";
import type { Lang } from "../../lib/types";

interface PlanListItem {
  id: number;
  skill: string;
  title: string;
  params: { minutes: number; lang: Lang };
  updatedAt: string;
}

export default function Planner() {
  const { t, lang } = useLang();
  const { skills, name } = useSkills();
  const { aiEnabled } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(params.get("skill") ?? "m-fact");
  const [minutes, setMinutes] = useState(60);
  const [planLang, setPlanLang] = useState<Lang>(lang);
  const [notes, setNotes] = useState("");
  const [useClassData, setUseClassData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plans = useApi<PlanListItem[]>("/api/teacher/plans");

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: number }>("/api/teacher/plans", { method: "POST", json: { skill, minutes, lang: planLang, notes: notes || undefined, useClassData } });
      navigate(`/t/plan/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("Curriculum & lesson planner", "Perancang kurikulum & pelajaran")} title={t("Plan a lesson", "Rancang pelajaran")} />
      {!aiEnabled && <AiOffNotice />}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="p-skill">{t("Form 2 topic (KSSM)", "Topik Tingkatan 2 (KSSM)")}</label>
              <select id="p-skill" className="input" value={skill} onChange={(e) => setSkill(e.target.value)}>
                {(["math", "sci"] as const).map((subj) => (
                  <optgroup key={subj} label={subj === "math" ? t("Mathematics", "Matematik") : t("Science", "Sains")}>
                    {skills
                      .filter((s) => s.subject === subj)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {t("Ch.", "Bab")} {s.chapter} · {name(s.id)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <p className="label">{t("Lesson length", "Tempoh pelajaran")}</p>
              <div className="flex flex-wrap gap-1.5">
                {[30, 40, 60, 80].map((m) => (
                  <button key={m} onClick={() => setMinutes(m)} aria-pressed={minutes === m} className={`chip ${minutes === m ? "!border-ink-800 !bg-ink-800 !text-white dark:!border-sun-400 dark:!bg-sun-400 dark:!text-ink-900" : ""}`}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">{t("Plan language", "Bahasa rancangan")}</p>
              <div className="flex gap-1.5">
                {(["ms", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setPlanLang(l)} aria-pressed={planLang === l} className={`chip ${planLang === l ? "!border-ink-800 !bg-ink-800 !text-white dark:!border-sun-400 dark:!bg-sun-400 dark:!text-ink-900" : ""}`}>
                    {l === "ms" ? "Bahasa Melayu" : "English"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="p-notes">{t("Anything to include? (optional)", "Apa-apa yang perlu dimasukkan? (pilihan)")}</label>
            <textarea
              id="p-notes"
              rows={2}
              maxLength={400}
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("e.g. use algebra tiles; class has 32 students; no projector", "cth. guna jubin algebra; kelas 32 murid; tiada projektor")}
            />
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-paper-100 p-3 text-sm dark:bg-white/5">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-ink-600" checked={useClassData} onChange={(e) => setUseClassData(e.target.checked)} />
            <span>
              <strong>{t("Personalise with my class data", "Peribadikan dengan data kelas saya")}</strong>
              <span className="block muted">
                {t("Uses mastery and misconceptions for this topic (no student names) to target the plan.", "Guna penguasaan dan salah faham bagi topik ini (tanpa nama murid) untuk menyasarkan rancangan.")}
              </span>
            </span>
          </label>
          {error && <ErrorNote message={error} />}
          <button className="btn-sun w-full !py-3" onClick={generate} disabled={busy || !aiEnabled}>
            {busy ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {busy ? t("Writing your lesson plan (about 30–60 s)…", "Menulis rancangan pelajaran (kira-kira 30–60 s)…") : t("Generate lesson plan", "Jana rancangan pelajaran")}
          </button>
        </div>

        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <BookOpenCheck className="h-5 w-5 text-ink-500" /> {t("Your plans", "Rancangan anda")}
          </h2>
          <ul className="mt-2 divide-y divide-paper-200 dark:divide-white/8">
            {plans.data?.length === 0 && <li className="py-3 text-sm muted">{t("No plans yet. Your first one will appear here.", "Belum ada rancangan.")}</li>}
            {plans.data?.map((p) => (
              <li key={p.id}>
                <Link to={`/t/plan/${p.id}`} className="flex items-center gap-3 py-3 hover:underline">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.title}</p>
                    <p className="text-xs muted">
                      {name(p.skill)} · {p.params.minutes} min · {p.params.lang.toUpperCase()} · {fmt.date(p.updatedAt, lang)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 muted" />
                </Link>
              </li>
            ))}
          </ul>
          <Link to={`/t/worksheets?skill=${skill}`} className="btn-ghost mt-3 w-full">
            {t("Make a worksheet with answer key", "Buat lembaran kerja dengan skema jawapan")}
          </Link>
        </div>
      </div>
    </div>
  );
}
