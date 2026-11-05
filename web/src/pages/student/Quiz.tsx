import { ArrowRight, Check, CheckCircle2, MessageCircleQuestion, PartyPopper, RotateCcw, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MathText } from "../../components/MathText";
import { ErrorNote, LevelPill, levelOf, MasteryBar, PageLoader, Spinner } from "../../components/ui";
import { api, newSessionId } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import type { AnswerResult, QuizQuestion } from "../../lib/types";

const QUIZ_LENGTH = 5;

interface Done {
  q: QuizQuestion;
  response: string;
  result: AnswerResult;
}

export default function Quiz() {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const [params] = useSearchParams();
  const skill = params.get("skill");
  const subject = params.get("subject");
  const [session, setSession] = useState(newSessionId);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [done, setDone] = useState<Done[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (exclude: number[]) => {
      setError(null);
      setQuestion(null);
      setSelected("");
      setResult(null);
      const qs = new URLSearchParams({ lang });
      if (skill) qs.set("skill", skill);
      else if (subject) qs.set("subject", subject);
      if (exclude.length) qs.set("exclude", exclude.join(","));
      try {
        setQuestion(await api<QuizQuestion>(`/api/quiz/next?${qs}`));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [skill, subject, lang],
  );

  useEffect(() => {
    void load([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, subject]);

  useEffect(() => {
    if (question?.kind === "num") inputRef.current?.focus();
  }, [question]);

  async function submit() {
    if (!question || !selected.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api<AnswerResult>(`/api/quiz/answer?lang=${lang}`, {
        method: "POST",
        json: { questionId: question.id, response: selected.trim(), session },
      });
      setResult(r);
      setDone((d) => [...d, { q: question, response: selected.trim(), result: r }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (done.length >= QUIZ_LENGTH) {
      setShowSummary(true);
      return;
    }
    void load(done.map((d) => d.q.id));
  }

  function restart() {
    setDone([]);
    setShowSummary(false);
    setSession(newSessionId());
    void load([]);
  }

  const finished = showSummary;
  const title = skill ? name(skill) : subject === "sci" ? t("Science mix", "Campuran Sains") : t("Maths mix", "Campuran Matematik");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/s/practice" className="rounded-full p-2 hover:bg-ink-800/5 dark:hover:bg-white/5" title={t("Close quiz", "Tutup kuiz")}>
          <X className="h-5 w-5" />
          <span className="sr-only">{t("Close quiz", "Tutup kuiz")}</span>
        </Link>
        <div className="flex flex-1 gap-1.5" aria-label={t(`Question ${Math.min(done.length + 1, QUIZ_LENGTH)} of ${QUIZ_LENGTH}`, `Soalan ${Math.min(done.length + 1, QUIZ_LENGTH)} daripada ${QUIZ_LENGTH}`)}>
          {Array.from({ length: QUIZ_LENGTH }, (_, i) => {
            const d = done[i];
            return (
              <span
                key={i}
                className={`h-2.5 flex-1 rounded-full ${d ? (d.result.correct ? "bg-mint-400" : "bg-coral-400") : i === done.length ? "bg-sun-400" : "bg-ink-100 dark:bg-white/10"}`}
              />
            );
          })}
        </div>
        <span className="text-sm font-bold muted">
          {Math.min(done.length + (result ? 0 : 1), QUIZ_LENGTH)}/{QUIZ_LENGTH}
        </span>
      </div>

      {error && <ErrorNote message={error} onRetry={() => load(done.map((d) => d.q.id))} />}

      {finished ? (
        <Summary done={done} onRestart={restart} />
      ) : !question ? (
        !error && <PageLoader />
      ) : (
        <div className="rise" key={question.id}>
          <p className="eyebrow">{title}</p>
          {(skill === null || question.skill !== skill) && <p className="text-sm font-semibold muted">{name(question.skill)}</p>}
          <div className="card mt-3 !p-6">
            <div className="text-lg font-semibold leading-relaxed sm:text-xl">
              <MathText text={question.stem} />
            </div>
            {question.source === "ai" && <p className="mt-2 text-xs muted">{t("Teacher-approved AI question", "Soalan AI yang diluluskan guru")}</p>}
          </div>

          {question.kind === "mcq" && question.choices ? (
            <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label={t("Answer choices", "Pilihan jawapan")}>
              {question.choices.map((c, i) => {
                const isSel = selected === String(i);
                const isCorrect = result && result.correctIndex === i;
                const isWrongPick = result && isSel && !result.correct;
                return (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={isSel}
                    disabled={Boolean(result)}
                    onClick={() => setSelected(String(i))}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition ${
                      isCorrect
                        ? "border-mint-400 bg-mint-100 dark:bg-mint-400/15"
                        : isWrongPick
                          ? "border-coral-400 bg-coral-100 dark:bg-coral-500/15"
                          : isSel
                            ? "border-ink-500 bg-ink-100 dark:border-sun-400 dark:bg-white/10"
                            : "border-paper-200 bg-white hover:border-ink-300 dark:border-white/10 dark:bg-ink-900"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                        isCorrect ? "bg-mint-400 text-white" : isWrongPick ? "bg-coral-400 text-white" : isSel ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : "bg-ink-100 dark:bg-white/10"
                      }`}
                    >
                      {isCorrect ? <Check className="h-4 w-4" /> : isWrongPick ? <X className="h-4 w-4" /> : "ABCD"[i]}
                    </span>
                    <MathText text={c} />
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label htmlFor="ans" className="label">
                {t("Your answer (a number)", "Jawapan anda (nombor)")}
              </label>
              <input
                id="ans"
                ref={inputRef}
                inputMode="decimal"
                autoComplete="off"
                className="input text-lg font-semibold"
                value={selected}
                disabled={Boolean(result)}
                onChange={(e) => setSelected(e.target.value)}
                placeholder={t("e.g. 42", "cth. 42")}
              />
            </form>
          )}

          {!result ? (
            <button onClick={submit} disabled={!selected.trim() || busy} className="btn-sun mt-5 w-full !py-3.5 text-base">
              {busy ? <Spinner /> : t("Check answer", "Semak jawapan")}
            </button>
          ) : (
            <Feedback result={result} question={question} response={selected} onNext={next} last={done.length >= QUIZ_LENGTH} />
          )}
        </div>
      )}
    </div>
  );
}

function Feedback({ result, question, response, onNext, last }: { result: AnswerResult; question: QuizQuestion; response: string; onNext: () => void; last: boolean }) {
  const { t } = useLang();
  const { name } = useSkills();
  const before = Math.round(result.pBefore * 100);
  const after = Math.round(result.pAfter * 100);
  return (
    <div className={`pop mt-5 rounded-3xl border-2 p-5 ${result.correct ? "border-mint-400 bg-mint-100/70 dark:bg-mint-400/10" : "border-coral-400 bg-coral-100/70 dark:bg-coral-500/10"}`} aria-live="polite">
      <div className="flex items-center gap-2">
        {result.correct ? <CheckCircle2 className="h-6 w-6 text-mint-500" /> : <XCircle className="h-6 w-6 text-coral-500" />}
        <p className="font-display text-xl font-extrabold">
          {result.correct ? t("Correct!", "Betul!") : t("Not quite", "Belum tepat")}
        </p>
        <span className="ml-auto rounded-full bg-white/70 px-2.5 py-1 text-xs font-extrabold dark:bg-white/10">+{result.xp} XP</span>
      </div>
      {!result.correct && (
        <p className="mt-2 text-sm">
          {t("Correct answer:", "Jawapan betul:")} <strong><MathText text={result.correctAnswer} /></strong>
        </p>
      )}
      {result.misconception && (
        <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-white/5">
          <span className="font-bold">{t("Common slip: ", "Kesilapan biasa: ")}</span>
          {result.misconception}
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed">
        <MathText text={result.explanation} />
      </p>
      <div className="mt-4 rounded-2xl bg-white/70 p-3 dark:bg-white/5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span>
            {t("Mastery", "Penguasaan")}: {name(question.skill)}
          </span>
          <span>
            {before}% → <span className={after >= before ? "text-mint-500" : "text-coral-500"}>{after}%</span>
          </span>
        </div>
        <MasteryBar p={result.pAfter} level={levelOf(result.pAfter)} className="mt-1.5" />
        {result.mastered && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-mint-500">
            <PartyPopper className="h-4 w-4" /> {t("Topic mastered! +50 XP", "Topik dikuasai! +50 XP")}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!result.correct && (
          <Link to={`/s/tutor?q=${question.id}&r=${encodeURIComponent(response)}`} className="btn-primary flex-1">
            <MessageCircleQuestion className="h-4 w-4" /> {t("Ask CikguAI why", "Tanya CikguAI kenapa")}
          </Link>
        )}
        <button onClick={onNext} className="btn-sun flex-1">
          {last ? t("See results", "Lihat keputusan") : t("Next question", "Soalan seterusnya")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Summary({ done, onRestart }: { done: Done[]; onRestart: () => void }) {
  const { t } = useLang();
  const { name } = useSkills();
  const correct = done.filter((d) => d.result.correct).length;
  const xp = done.reduce((s, d) => s + d.result.xp, 0);
  // Net mastery change per skill across the quiz.
  const bySkill = new Map<string, { from: number; to: number }>();
  for (const d of done) {
    const cur = bySkill.get(d.q.skill);
    bySkill.set(d.q.skill, { from: cur?.from ?? d.result.pBefore, to: d.result.pAfter });
  }
  return (
    <div className="pop card text-center !p-7">
      <PartyPopper className="mx-auto h-10 w-10 text-sun-500" />
      <h1 className="mt-2 text-3xl font-extrabold">
        {correct}/{done.length} {t("correct", "betul")}
      </h1>
      <p className="muted">+{xp} XP</p>
      <ul className="mx-auto mt-5 max-w-sm space-y-3 text-left">
        {[...bySkill.entries()].map(([skill, v]) => (
          <li key={skill}>
            <div className="flex justify-between text-sm font-bold">
              <span>{name(skill)}</span>
              <span>
                {Math.round(v.from * 100)}% → <span className={v.to >= v.from ? "text-mint-500" : "text-coral-500"}>{Math.round(v.to * 100)}%</span>
              </span>
            </div>
            <MasteryBar p={v.to} level={levelOf(v.to)} className="mt-1" />
            <div className="mt-1">
              <LevelPill level={levelOf(v.to)} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button onClick={onRestart} className="btn-sun">
          <RotateCcw className="h-4 w-4" /> {t("5 more", "5 lagi")}
        </button>
        <Link to="/s" className="btn-ghost">
          {t("Back home", "Kembali ke utama")}
        </Link>
      </div>
    </div>
  );
}
