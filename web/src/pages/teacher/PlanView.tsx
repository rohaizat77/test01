import { ArrowLeft, Download, FileText, Pencil, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MathText } from "../../components/MathText";
import { ErrorNote, PageLoader, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { downloadBlob, lessonPlanDocx } from "../../lib/docx";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi, useSession } from "../../lib/session";
import type { Lang, LessonPlan } from "../../lib/types";

interface PlanResp {
  id: number;
  skill: string;
  params: { minutes: number; lang: Lang; notes: string | null; useClassData: boolean };
  plan: LessonPlan;
}

export default function PlanView() {
  const { id } = useParams();
  const { t } = useLang();
  const { name, byId } = useSkills();
  const { user } = useSession();
  const navigate = useNavigate();
  const { data, error, reload } = useApi<PlanResp>(`/api/teacher/plans/${id}`);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setPlan(data.plan);
  }, [data]);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data || !plan) return <PageLoader />;
  // Plan content is written in the plan's own language; headings follow it too.
  const pt = (en: string, ms: string) => (data.params.lang === "ms" ? ms : en);
  const total = plan.phases.reduce((s, p) => s + p.minutes, 0);

  async function save() {
    setBusy("save");
    setErr(null);
    try {
      await api(`/api/teacher/plans/${id}`, { method: "PUT", json: { plan } });
      setEditing(false);
      setMsg(t("Saved.", "Disimpan."));
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function exportDocx() {
    setBusy("docx");
    try {
      const blob = await lessonPlanDocx(plan!, { topic: `${name(data!.skill)} (${pt("Form", "Tingkatan")} 2, ${pt("Ch.", "Bab")} ${byId.get(data!.skill)?.chapter})`, minutes: data!.params.minutes, className: user?.className ?? "" }, pt);
      downloadBlob(blob, `${plan!.title.replace(/[^\w\- ]+/g, "").slice(0, 60) || "lesson-plan"}.docx`);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(t("Delete this lesson plan?", "Padam rancangan pelajaran ini?"))) return;
    await api(`/api/teacher/plans/${id}`, { method: "DELETE" });
    navigate("/t/plan");
  }

  const set = <K extends keyof LessonPlan>(k: K, v: LessonPlan[K]) => setPlan({ ...plan, [k]: v });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/t/plan" className="inline-flex items-center gap-1 text-sm font-bold muted hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t("Planner", "Perancang")}
        </Link>
        <div className="flex flex-wrap gap-2">
          {msg && <span className="self-center text-sm font-bold text-mint-500">{msg}</span>}
          {editing ? (
            <>
              <button className="btn-ghost !py-2" onClick={() => { setPlan(data.plan); setEditing(false); }}>
                <X className="h-4 w-4" /> {t("Cancel", "Batal")}
              </button>
              <button className="btn-primary !py-2" onClick={save} disabled={busy === "save"}>
                {busy === "save" ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} {t("Save", "Simpan")}
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost !py-2" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> {t("Edit", "Sunting")}
              </button>
              <button className="btn-ghost !py-2" onClick={exportDocx} disabled={busy === "docx"}>
                {busy === "docx" ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} DOCX
              </button>
              <button className="btn-ghost !py-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> PDF
              </button>
              <Link to={`/t/worksheets?skill=${data.skill}`} className="btn-sun !py-2">
                <FileText className="h-4 w-4" /> {t("Worksheet", "Lembaran kerja")}
              </Link>
              <button className="rounded-full p-2 hover:bg-coral-100" onClick={remove} title={t("Delete", "Padam")}>
                <Trash2 className="h-4 w-4 text-coral-500" />
                <span className="sr-only">{t("Delete", "Padam")}</span>
              </button>
            </>
          )}
        </div>
      </div>
      {err && <ErrorNote message={err} />}

      <article className="card print-plain space-y-5 !p-6 sm:!p-8">
        <header>
          <p className="eyebrow">
            {name(data.skill)} · {pt("Form 2", "Tingkatan 2")} · {pt("Ch.", "Bab")} {byId.get(data.skill)?.chapter} · {data.params.minutes} min
          </p>
          {editing ? (
            <input className="input mt-1 font-display text-xl font-extrabold" value={plan.title} onChange={(e) => set("title", e.target.value)} aria-label={t("Title", "Tajuk")} />
          ) : (
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              <MathText text={plan.title} />
            </h1>
          )}
          {data.params.useClassData && <p className="no-print mt-1 text-xs muted">{t("Personalised with your class's mastery and misconception data.", "Diperibadikan dengan data penguasaan dan salah faham kelas anda.")}</p>}
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <ListBlock title={pt("Learning objectives", "Objektif pembelajaran")} items={plan.learning_objectives} editing={editing} onChange={(v) => set("learning_objectives", v)} />
          <ListBlock title={pt("Success criteria", "Kriteria kejayaan")} items={plan.success_criteria} editing={editing} onChange={(v) => set("success_criteria", v)} />
        </div>
        <ListBlock title={pt("Materials", "Bahan")} items={plan.materials} editing={editing} onChange={(v) => set("materials", v)} inline />

        <section>
          <h2 className="text-lg font-extrabold">
            {pt("Lesson flow", "Aliran pelajaran")} <span className="text-sm font-semibold muted">({total} min)</span>
          </h2>
          <ol className="mt-2 space-y-2">
            {plan.phases.map((p, i) => (
              <li key={i} className="grid gap-3 rounded-2xl border border-paper-200 p-3 sm:grid-cols-[120px_1fr] dark:border-white/8">
                <div>
                  {editing ? (
                    <>
                      <input className="input !py-1.5 text-sm font-bold" value={p.name} onChange={(e) => set("phases", plan.phases.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={t("Phase name", "Nama fasa")} />
                      <input type="number" min={1} max={120} className="input mt-1 !py-1.5 text-sm" value={p.minutes} onChange={(e) => set("phases", plan.phases.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) } : x)))} aria-label={t("Minutes", "Minit")} />
                    </>
                  ) : (
                    <>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-sm font-extrabold text-ink-500 dark:text-sun-400">{p.minutes} min</p>
                    </>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  {editing ? (
                    <>
                      <textarea rows={3} className="input text-sm" value={p.teacher} onChange={(e) => set("phases", plan.phases.map((x, j) => (j === i ? { ...x, teacher: e.target.value } : x)))} aria-label={t("Teacher", "Guru")} />
                      <textarea rows={2} className="input text-sm" value={p.students} onChange={(e) => set("phases", plan.phases.map((x, j) => (j === i ? { ...x, students: e.target.value } : x)))} aria-label={t("Students", "Murid")} />
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>{pt("Teacher:", "Guru:")}</strong> <MathText text={p.teacher} />
                      </p>
                      <p>
                        <strong>{pt("Students:", "Murid:")}</strong> <MathText text={p.students} />
                      </p>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <ListBlock title={pt("Support (still developing)", "Sokongan (masih berkembang)")} items={plan.differentiation.support} editing={editing} onChange={(v) => set("differentiation", { ...plan.differentiation, support: v })} />
          <ListBlock title={pt("Extension (already mastered)", "Pengayaan (sudah menguasai)")} items={plan.differentiation.extension} editing={editing} onChange={(v) => set("differentiation", { ...plan.differentiation, extension: v })} />
        </div>

        <section>
          <h2 className="text-lg font-extrabold">{pt("Misconceptions to watch", "Salah faham untuk diperhatikan")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {plan.misconceptions.map((m, i) => (
              <li key={i} className="rounded-2xl bg-coral-100/60 p-3 dark:bg-coral-500/10">
                {editing ? (
                  <div className="grid gap-1.5">
                    <input className="input !py-1.5 text-sm font-bold" value={m.misconception} onChange={(e) => set("misconceptions", plan.misconceptions.map((x, j) => (j === i ? { ...x, misconception: e.target.value } : x)))} aria-label={t("Misconception", "Salah faham")} />
                    <textarea rows={2} className="input text-sm" value={m.how_to_address} onChange={(e) => set("misconceptions", plan.misconceptions.map((x, j) => (j === i ? { ...x, how_to_address: e.target.value } : x)))} aria-label={t("How to address", "Cara menangani")} />
                  </div>
                ) : (
                  <>
                    <p className="font-bold">
                      <MathText text={m.misconception} />
                    </p>
                    <p>
                      <MathText text={m.how_to_address} />
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <ListBlock title={pt("Assessment", "Pentaksiran")} items={plan.assessment} editing={editing} onChange={(v) => set("assessment", v)} />

        <section>
          <h2 className="text-lg font-extrabold">{pt("Exit ticket", "Tiket keluar")}</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            {plan.exit_ticket.map((q, i) => (
              <li key={i}>
                {editing ? (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <input className="input !py-1.5 text-sm" value={q.question} onChange={(e) => set("exit_ticket", plan.exit_ticket.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} aria-label={t("Question", "Soalan")} />
                    <input className="input !py-1.5 text-sm" value={q.answer} onChange={(e) => set("exit_ticket", plan.exit_ticket.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} aria-label={t("Answer", "Jawapan")} />
                  </div>
                ) : (
                  <>
                    <MathText text={q.question} /> <span className="muted">({pt("Answer", "Jawapan")}: <MathText text={q.answer} />)</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-extrabold">{pt("Homework", "Kerja rumah")}</h2>
          {editing ? (
            <textarea rows={2} className="input mt-2 text-sm" value={plan.homework} onChange={(e) => set("homework", e.target.value)} aria-label={t("Homework", "Kerja rumah")} />
          ) : (
            <p className="mt-1 text-sm">
              <MathText text={plan.homework} />
            </p>
          )}
        </section>
        <p className="border-t border-paper-200 pt-3 text-xs muted dark:border-white/8">{pt("Generated with CikguAI and reviewed by the teacher.", "Dijana dengan CikguAI dan disemak oleh guru.")}</p>
      </article>
    </div>
  );
}

function ListBlock({ title, items, editing, onChange, inline }: { title: string; items: string[]; editing: boolean; onChange: (v: string[]) => void; inline?: boolean }) {
  const { t } = useLang();
  return (
    <section>
      <h2 className="text-lg font-extrabold">{title}</h2>
      {editing ? (
        <div className="mt-2 space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex gap-1.5">
              <input className="input !py-1.5 text-sm" value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`${title} ${i + 1}`} />
              <button className="rounded-full p-2 hover:bg-ink-800/10" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">{t("Remove", "Buang")}</span>
              </button>
            </div>
          ))}
          <button className="chip !text-xs" onClick={() => onChange([...items, ""])}>
            <Plus className="h-3.5 w-3.5" /> {t("Add", "Tambah")}
          </button>
        </div>
      ) : inline ? (
        <p className="mt-1 text-sm">{items.join(" · ")}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {items.map((it, i) => (
            <li key={i}>
              <MathText text={it} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
