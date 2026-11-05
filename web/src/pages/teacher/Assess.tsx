import { ArrowRight, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Empty, ErrorNote, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api, fmt } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi } from "../../lib/session";
import type { AssignmentListItem, RubricItem } from "../../lib/types";

export default function Assess() {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const { data, error, reload } = useApi<AssignmentListItem[]>("/api/teacher/assignments");
  const [creating, setCreating] = useState(false);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("Automated assessment", "Penilaian automatik")} title={t("Assignments", "Tugasan")}>
        {!creating && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t("New assignment", "Tugasan baharu")}
          </button>
        )}
      </PageHeader>
      <p className="-mt-3 max-w-2xl text-sm muted">
        {t(
          "Students answer by typing or with a photo. CikguAI drafts a grade against your rubric with feedback and a confidence level. Nothing reaches students until you review and approve it.",
          "Murid menjawab dengan menaip atau gambar. CikguAI mendraf gred berdasarkan rubrik anda beserta maklum balas dan tahap keyakinan. Tiada apa-apa sampai kepada murid sehingga anda menyemak dan meluluskannya.",
        )}
      </p>
      {creating && <NewAssignment onClose={() => setCreating(false)} />}
      {data.length === 0 && !creating && <Empty title={t("No assignments yet", "Tiada tugasan lagi")} />}
      <ul className="grid gap-3 md:grid-cols-2">
        {data.map((a) => {
          const toReview = a.counts.aiGraded + a.counts.submitted;
          return (
            <li key={a.id}>
              <Link to={`/t/assess/${a.id}`} className="card block transition hover:border-ink-400">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {a.skill && <p className="text-xs font-bold muted">{name(a.skill)}</p>}
                    <h2 className="font-display text-lg font-extrabold">{a.title}</h2>
                  </div>
                  {toReview > 0 ? (
                    <span className="rounded-full bg-sun-400 px-2.5 py-1 text-xs font-extrabold text-ink-900">{t(`${toReview} to review`, `${toReview} untuk disemak`)}</span>
                  ) : (
                    <span className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-extrabold text-mint-500 dark:bg-mint-400/15">{t("All marked", "Semua disemak")}</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm muted">{a.prompt}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold muted">
                  <span>
                    {a.counts.submitted + a.counts.aiGraded + a.counts.approved}/{a.classSize} {t("submitted", "dihantar")}
                  </span>
                  <span>
                    {a.counts.approved} {t("released", "dipulangkan")}
                  </span>
                  {a.avgFinal !== null && (
                    <span>
                      {t("avg", "purata")} {fmt.num(a.avgFinal, 1)}/{a.maxScore}
                    </span>
                  )}
                  {a.dueDate && (
                    <span>
                      {t("due", "tarikh akhir")} {fmt.date(a.dueDate, lang)}
                    </span>
                  )}
                  <ArrowRight className="ml-auto h-4 w-4" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewAssignment({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const { skills, name } = useSkills();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [prompt, setPrompt] = useState("");
  const [due, setDue] = useState("");
  const [rubric, setRubric] = useState<RubricItem[]>([
    { criterion: t("Correct answer", "Jawapan betul"), max: 2, descriptor: "" },
    { criterion: t("Working shown", "Jalan kerja ditunjukkan"), max: 2, descriptor: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: number }>("/api/teacher/assignments", {
        method: "POST",
        json: { title, skill: skill || null, prompt, rubric: rubric.map((x) => ({ ...x, descriptor: x.descriptor || x.criterion })), dueDate: due || null },
      });
      navigate(`/t/assess/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{t("New assignment", "Tugasan baharu")}</h2>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-ink-800/5">
          <X className="h-5 w-5" />
          <span className="sr-only">{t("Close", "Tutup")}</span>
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label className="label" htmlFor="a-title">{t("Title", "Tajuk")}</label>
          <input id="a-title" className="input" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-skill">{t("Topic", "Topik")}</label>
          <select id="a-skill" className="input" value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">{t("(none)", "(tiada)")}</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {name(s.id)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-due">{t("Due date", "Tarikh akhir")}</label>
          <input id="a-due" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="a-prompt">{t("Question for students", "Soalan untuk murid")}</label>
        <textarea id="a-prompt" rows={3} className="input" value={prompt} maxLength={2000} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <div>
        <p className="label">{t("Rubric", "Rubrik")}</p>
        <ul className="space-y-2">
          {rubric.map((r, i) => (
            <li key={i} className="grid gap-2 rounded-2xl bg-paper-100 p-2 sm:grid-cols-[1fr_80px_2fr_auto] dark:bg-white/5">
              <input aria-label={t("Criterion", "Kriteria")} className="input !py-2" value={r.criterion} placeholder={t("Criterion", "Kriteria")} onChange={(e) => setRubric(rubric.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)))} />
              <input aria-label={t("Marks", "Markah")} type="number" min={1} max={20} className="input !py-2" value={r.max} onChange={(e) => setRubric(rubric.map((x, j) => (j === i ? { ...x, max: Number(e.target.value) } : x)))} />
              <input aria-label={t("What earns full marks", "Apa yang layak markah penuh")} className="input !py-2" value={r.descriptor} placeholder={t("What earns full marks", "Apa yang layak markah penuh")} onChange={(e) => setRubric(rubric.map((x, j) => (j === i ? { ...x, descriptor: e.target.value } : x)))} />
              <button className="rounded-full p-2 hover:bg-ink-800/10" onClick={() => setRubric(rubric.filter((_, j) => j !== i))} disabled={rubric.length === 1}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">{t("Remove", "Buang")}</span>
              </button>
            </li>
          ))}
        </ul>
        {rubric.length < 8 && (
          <button className="chip mt-2 !text-xs" onClick={() => setRubric([...rubric, { criterion: "", max: 1, descriptor: "" }])}>
            <Plus className="h-3.5 w-3.5" /> {t("Add criterion", "Tambah kriteria")}
          </button>
        )}
      </div>
      {error && <ErrorNote message={error} />}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>{t("Cancel", "Batal")}</button>
        <button className="btn-primary" onClick={save} disabled={busy || !title.trim() || prompt.trim().length < 5 || rubric.some((r) => !r.criterion.trim())}>
          {busy && <Spinner className="h-4 w-4" />} {t("Create & share with class", "Cipta & kongsi dengan kelas")}
        </button>
      </div>
    </div>
  );
}
