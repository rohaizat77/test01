import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil, ShieldCheck, Sparkles, UserX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MathText } from "../../components/MathText";
import { AiOffNotice, Avatar, ErrorNote, PageLoader, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi, useSession } from "../../lib/session";
import type { RubricItem, Submission } from "../../lib/types";

interface Data {
  assignment: { id: number; title: string; skill: string | null; prompt: string; rubric: RubricItem[]; maxScore: number; dueDate: string | null };
  submissions: Submission[];
  missing: { id: number; name: string }[];
}

export default function AssignmentReview() {
  const { id } = useParams();
  const { t } = useLang();
  const { name } = useSkills();
  const { aiEnabled } = useSession();
  const { data, error, reload, setData } = useApi<Data>(`/api/teacher/assignments/${id}`);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  const a = data.assignment;
  const ungraded = data.submissions.filter((s) => s.status === "submitted");

  function replace(sub: Submission) {
    setData((d) => (d ? { ...d, submissions: d.submissions.map((s) => (s.id === sub.id ? sub : s)) } : d));
  }

  // Grade one at a time so each result appears as soon as it's ready.
  async function gradeAll() {
    setBatchError(null);
    setBatch({ done: 0, total: ungraded.length });
    for (let i = 0; i < ungraded.length; i++) {
      try {
        replace(await api<Submission>(`/api/teacher/submissions/${ungraded[i].id}/grade`, { method: "POST", json: {} }));
      } catch (e) {
        setBatchError((e as Error).message);
        break;
      }
      setBatch({ done: i + 1, total: ungraded.length });
    }
    setBatch(null);
  }

  return (
    <div className="space-y-5">
      <Link to="/t/assess" className="inline-flex items-center gap-1 text-sm font-bold muted hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t("Assignments", "Tugasan")}
      </Link>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card">
          {a.skill && <p className="text-xs font-bold muted">{name(a.skill)}</p>}
          <h1 className="text-2xl font-extrabold">{a.title}</h1>
          <p className="mt-2 whitespace-pre-line">
            <MathText text={a.prompt} />
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-extrabold">
            {t("Rubric", "Rubrik")} ({a.maxScore} {t("marks", "markah")})
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {a.rubric.map((r) => (
              <li key={r.criterion}>
                <strong>{r.criterion}</strong> ({r.max}) <span className="muted">{r.descriptor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-mint-500" />
          {t("AI drafts the grade, you decide. Students only see results you approve.", "AI mendraf gred, anda membuat keputusan. Murid hanya nampak keputusan yang anda luluskan.")}
        </p>
        {aiEnabled && ungraded.length > 0 && (
          <button className="btn-sun" onClick={gradeAll} disabled={Boolean(batch)}>
            {batch ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {batch ? t(`Grading ${batch.done + 1} of ${batch.total}…`, `Menggred ${batch.done + 1} daripada ${batch.total}…`) : t(`Grade ${ungraded.length} with AI`, `Gred ${ungraded.length} dengan AI`)}
          </button>
        )}
      </div>
      {!aiEnabled && <AiOffNotice />}
      {batchError && <ErrorNote message={batchError} />}

      <ul className="space-y-3">
        {data.submissions.map((s) => (
          // Remount when a new AI grade arrives so the form starts from it.
          <li key={`${s.id}-${s.status}-${s.aiScore ?? ""}`}>
            <SubmissionCard s={s} rubric={a.rubric} onChange={replace} onApproved={reload} />
          </li>
        ))}
      </ul>

      {data.missing.length > 0 && (
        <div className="card">
          <p className="flex items-center gap-2 font-bold">
            <UserX className="h-4 w-4" /> {t(`Not submitted yet (${data.missing.length})`, `Belum menghantar (${data.missing.length})`)}
          </p>
          <p className="mt-1 text-sm muted">{data.missing.map((m) => m.name).join(", ")}</p>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ s, rubric, onChange, onApproved }: { s: Submission; rubric: RubricItem[]; onChange: (s: Submission) => void; onApproved: () => void }) {
  const { t } = useLang();
  const { aiEnabled } = useSession();
  const [busy, setBusy] = useState<"grade" | "approve" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const initial = s.final?.criteria.map((c) => c.score) ?? s.ai?.criteria.map((c) => c.score) ?? rubric.map(() => 0);
  const [scores, setScores] = useState<number[]>(initial);
  const [feedback, setFeedback] = useState(s.final?.feedback ?? s.ai?.overall_feedback ?? "");
  const [note, setNote] = useState(s.teacherNote ?? "");
  const total = scores.reduce((a, b) => a + b, 0);
  const max = rubric.reduce((a, r) => a + r.max, 0);
  const reviewing = s.status === "ai_graded" || editing || (s.status === "submitted" && !aiEnabled);

  async function grade() {
    setBusy("grade");
    setError(null);
    try {
      const r = await api<Submission>(`/api/teacher/submissions/${s.id}/grade`, { method: "POST", json: {} });
      setScores(r.ai!.criteria.map((c) => c.score));
      setFeedback(r.ai!.overall_feedback);
      onChange(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      await api(`/api/teacher/submissions/${s.id}/approve`, { method: "POST", json: { scores, feedback, note: note || undefined } });
      setEditing(false);
      onApproved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const conf = s.ai?.confidence ?? null;
  return (
    <article className={`card ${s.status === "ai_graded" ? "!border-sun-400" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={s.studentName} id={s.studentId} />
        <p className="flex-1 font-bold">{s.studentName}</p>
        {s.status === "approved" && (
          <span className="chip !border-mint-400/40 !bg-mint-100 !text-mint-500 dark:!bg-mint-400/15">
            <CheckCircle2 className="h-4 w-4" /> {s.finalScore}/{max} · {t("released", "dipulangkan")}
          </span>
        )}
        {s.status === "ai_graded" && (
          <span className="rounded-full bg-sun-400 px-2.5 py-1 text-xs font-extrabold text-ink-900">
            {t("AI draft", "Draf AI")}: {s.aiScore}/{max}
          </span>
        )}
        {conf !== null && s.status !== "approved" && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${conf >= 0.8 ? "bg-mint-100 text-mint-500 dark:bg-mint-400/15" : conf >= 0.55 ? "bg-sun-100 text-[#9a6a00] dark:bg-sun-400/15 dark:text-sun-300" : "bg-coral-100 text-coral-500 dark:bg-coral-500/15"}`}
            title={t("How sure the AI is that a careful teacher would give the same total", "Sejauh mana AI yakin guru akan memberi jumlah yang sama")}
          >
            {t("Confidence", "Keyakinan")} {Math.round(conf * 100)}%
          </span>
        )}
      </div>

      <div className="mt-3 rounded-2xl bg-paper-100 p-3 text-sm dark:bg-white/5">
        {s.answerText && <p className="whitespace-pre-line">{s.answerText}</p>}
        {s.image && <img src={s.image} alt={t(`${s.studentName}'s working`, `Jalan kerja ${s.studentName}`)} className="mt-2 max-h-72 rounded-xl" />}
        {s.ai?.transcription && s.image && (
          <p className="mt-2 text-xs muted">
            <strong>{t("AI read the photo as:", "AI membaca gambar sebagai:")}</strong> {s.ai.transcription}
          </p>
        )}
      </div>

      {s.ai && s.ai.flags.length > 0 && s.status !== "approved" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-coral-500">
          <AlertTriangle className="h-3.5 w-3.5" /> {s.ai.flags.map((f) => f.replace(/_/g, " ")).join(" · ")}
        </p>
      )}

      {reviewing && (
        <div className="mt-3 space-y-3">
          <ul className="space-y-2">
            {rubric.map((r, i) => {
              const ai = s.ai?.criteria[i];
              return (
                <li key={r.criterion} className="grid gap-2 rounded-2xl border border-paper-200 p-3 sm:grid-cols-[1fr_auto] dark:border-white/8">
                  <div className="text-sm">
                    <p className="font-bold">
                      {r.criterion} <span className="font-normal muted">/ {r.max}</span>
                    </p>
                    {ai?.evidence && <p className="mt-0.5 text-xs muted">“{ai.evidence}”</p>}
                    {ai?.feedback && (
                      <p className="mt-1">
                        <MathText text={ai.feedback} />
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 self-start text-sm">
                    <span className="sr-only">{t(`Score for ${r.criterion}`, `Markah untuk ${r.criterion}`)}</span>
                    <input
                      type="number"
                      min={0}
                      max={r.max}
                      step={0.5}
                      value={scores[i] ?? 0}
                      onChange={(e) => setScores(scores.map((x, j) => (j === i ? Math.min(r.max, Math.max(0, Number(e.target.value))) : x)))}
                      className={`input !w-20 !py-1.5 text-center font-bold ${ai && scores[i] !== ai.score ? "!border-ink-500" : ""}`}
                    />
                    {ai && scores[i] !== ai.score && <span className="text-xs font-bold text-ink-500 dark:text-sun-400">{t(`AI: ${ai.score}`, `AI: ${ai.score}`)}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
          <div>
            <label className="label" htmlFor={`fb-${s.id}`}>{t("Feedback to student", "Maklum balas kepada murid")}</label>
            <textarea id={`fb-${s.id}`} rows={2} className="input text-sm" value={feedback} maxLength={1200} onChange={(e) => setFeedback(e.target.value)} />
          </div>
          {s.ai?.teacher_note && (
            <p className="rounded-xl bg-ink-100 px-3 py-2 text-xs dark:bg-white/5">
              <strong>{t("Note for you:", "Nota untuk anda:")}</strong> {s.ai.teacher_note}
            </p>
          )}
          <div>
            <label className="label" htmlFor={`note-${s.id}`}>{t("Private note (optional)", "Nota peribadi (pilihan)")}</label>
            <input id={`note-${s.id}`} className="input !py-2 text-sm" value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      )}

      {s.status === "approved" && !editing && s.final && (
        <p className="mt-3 text-sm">
          <MathText text={s.final.feedback} />
          {s.final.overriddenFromAi && <span className="ml-2 text-xs font-bold text-ink-500 dark:text-sun-400">({t("you adjusted the AI grade", "anda melaraskan gred AI")})</span>}
        </p>
      )}

      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {s.status === "submitted" && aiEnabled && (
          <>
            <button className="btn-ghost !py-2" onClick={() => setEditing(true)} disabled={Boolean(busy)}>
              <Pencil className="h-4 w-4" /> {t("Mark manually", "Tanda sendiri")}
            </button>
            <button className="btn-sun !py-2" onClick={grade} disabled={Boolean(busy)}>
              {busy === "grade" ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} {t("Grade with AI", "Gred dengan AI")}
            </button>
          </>
        )}
        {s.status === "approved" && !editing && (
          <button className="btn-ghost !py-2" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {t("Edit grade", "Ubah gred")}
          </button>
        )}
        {reviewing && (
          <button className="btn-primary !py-2" onClick={approve} disabled={Boolean(busy)}>
            {busy === "approve" ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {t(`Approve ${total}/${max} & release`, `Lulus ${total}/${max} & pulangkan`)}
          </button>
        )}
      </div>
    </article>
  );
}
