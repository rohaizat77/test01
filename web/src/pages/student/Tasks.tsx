import { CalendarClock, CheckCircle2, Clock, ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { MathText } from "../../components/MathText";
import { Empty, ErrorNote, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { fmt, shrinkImage, upload } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi } from "../../lib/session";
import type { StudentAssignment } from "../../lib/types";

export default function Tasks() {
  const { t, lang } = useLang();
  const { data, error, reload } = useApi<StudentAssignment[]>(`/api/student/assignments?lang=${lang}`);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader eyebrow={t("From your teacher", "Daripada guru anda")} title={t("Tasks", "Tugasan")} />
      {data.length === 0 && <Empty title={t("No tasks yet", "Tiada tugasan lagi")}>{t("When your teacher sets one, it appears here.", "Tugasan daripada guru akan dipaparkan di sini.")}</Empty>}
      {data.map((a) => (
        <TaskCard key={a.id} a={a} onDone={reload} />
      ))}
    </div>
  );
}

function TaskCard({ a, onDone }: { a: StudentAssignment; onDone: () => void }) {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const [open, setOpen] = useState(!a.submission);
  const [answer, setAnswer] = useState(a.submission?.answerText ?? "");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sub = a.submission;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("answer", answer);
      if (photo) form.append("image", photo.blob, "answer.jpg");
      await upload(`/api/student/assignments/${a.id}/submit`, form);
      setPhoto(null);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {a.skill && <p className="text-xs font-bold muted">{name(a.skill)}</p>}
          <h2 className="font-display text-lg font-extrabold">{a.title}</h2>
        </div>
        {sub?.status === "returned" ? (
          <span className="chip !border-mint-400/40 !bg-mint-100 !text-mint-500 dark:!bg-mint-400/15">
            <CheckCircle2 className="h-4 w-4" /> {sub.result?.score}/{a.maxScore}
          </span>
        ) : sub ? (
          <span className="chip !text-xs">
            <Clock className="h-3.5 w-3.5" /> {t("Waiting for your teacher", "Menunggu semakan guru")}
          </span>
        ) : (
          a.dueDate && (
            <span className={`chip !text-xs ${a.overdue ? "!text-coral-500" : ""}`}>
              <CalendarClock className="h-3.5 w-3.5" /> {t("Due", "Tarikh akhir")} {fmt.date(a.dueDate, lang)}
            </span>
          )
        )}
      </div>
      <p className="mt-2 whitespace-pre-line leading-relaxed">
        <MathText text={a.prompt} />
      </p>

      <details className="mt-3 rounded-2xl bg-paper-100 px-4 py-2 text-sm dark:bg-white/5">
        <summary className="cursor-pointer font-bold">{t(`How it's marked (${a.maxScore} marks)`, `Cara pemarkahan (${a.maxScore} markah)`)}</summary>
        <ul className="mt-2 space-y-1 pb-1">
          {a.rubric.map((r) => (
            <li key={r.criterion}>
              <strong>{r.criterion}</strong> ({r.max}): {r.descriptor}
            </li>
          ))}
        </ul>
      </details>

      {sub?.status === "returned" && sub.result && (
        <div className="mt-4 rounded-2xl border border-mint-400/40 bg-mint-100/60 p-4 dark:bg-mint-400/10">
          <p className="font-bold">{t("Your teacher's feedback", "Maklum balas guru")}</p>
          {sub.result.feedback && (
            <p className="mt-1 text-sm">
              <MathText text={sub.result.feedback} />
            </p>
          )}
          {sub.result.criteria?.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm">
              {sub.result.criteria.map((c) => (
                <li key={c.criterion}>
                  <span className="font-bold">
                    {c.criterion}: {c.score}/{c.max}
                  </span>
                  {c.feedback && (
                    <span className="block muted">
                      <MathText text={c.feedback} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sub && sub.status !== "returned" && !open && (
        <div className="mt-3 text-sm">
          <p className="muted">{t("Your answer:", "Jawapan anda:")}</p>
          {sub.answerText && <p className="whitespace-pre-line">{sub.answerText}</p>}
          {sub.image && <img src={sub.image} alt={t("Your working", "Jalan kerja anda")} className="mt-2 max-h-48 rounded-xl" />}
          <button className="mt-2 text-sm font-bold text-ink-500 underline dark:text-sun-400" onClick={() => setOpen(true)}>
            {t("Edit answer", "Ubah jawapan")}
          </button>
        </div>
      )}

      {sub?.status !== "returned" && open && (
        <div className="mt-4">
          <label htmlFor={`ans-${a.id}`} className="label">
            {t("Your answer", "Jawapan anda")}
          </label>
          <textarea
            id={`ans-${a.id}`}
            rows={4}
            maxLength={4000}
            className="input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("Show your working…", "Tunjukkan jalan kerja…")}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const blob = await shrinkImage(f);
                  setPhoto({ blob, url: URL.createObjectURL(blob) });
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            />
            <button type="button" className="chip" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> {t("Add photo of working", "Tambah gambar jalan kerja")}
            </button>
            {photo && (
              <span className="relative">
                <img src={photo.url} alt="" className="h-12 rounded-lg" />
                <button className="absolute -right-2 -top-2 rounded-full bg-ink-800 p-0.5 text-white" onClick={() => setPhoto(null)}>
                  <X className="h-3 w-3" />
                  <span className="sr-only">{t("Remove photo", "Buang gambar")}</span>
                </button>
              </span>
            )}
            <button className="btn-sun ml-auto" disabled={busy || (!answer.trim() && !photo)} onClick={submit}>
              {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />} {sub ? t("Resubmit", "Hantar semula") : t("Submit", "Hantar")}
            </button>
          </div>
          {error && (
            <div className="mt-2">
              <ErrorNote message={error} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
