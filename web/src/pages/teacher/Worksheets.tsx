import { Check, Database, Eye, EyeOff, Printer, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MathText } from "../../components/MathText";
import { AiOffNotice, ErrorNote, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useApi, useSession } from "../../lib/session";
import type { GeneratedQuestion, Lang } from "../../lib/types";

interface BankItem {
  id: number;
  kind: "mcq" | "num";
  difficulty: number;
  stem: string;
  choices: string[] | null;
  answer: string;
  source: "seed" | "ai";
  attempts: number;
  pctCorrect: number | null;
}

interface SheetQ {
  key: string;
  stem: string;
  choices: string[] | null;
  answer: string;
  explanation?: string;
  difficulty: string;
}

export default function Worksheets() {
  const { t, lang } = useLang();
  const { skills, name } = useSkills();
  const { aiEnabled, user } = useSession();
  const [params, setParams] = useSearchParams();
  const skill = params.get("skill") ?? "m-fact";
  const [tab, setTab] = useState<"ai" | "bank">(aiEnabled ? "ai" : "bank");
  const [count, setCount] = useState(6);
  const [mix, setMix] = useState<"easy" | "mixed" | "hard">("mixed");
  const [notes, setNotes] = useState("");
  const [gen, setGen] = useState<GeneratedQuestion[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);
  const [sheetLang, setSheetLang] = useState<Lang>(lang);
  const bank = useApi<BankItem[]>(tab === "bank" ? `/api/teacher/bank?skill=${skill}&lang=${sheetLang}` : null);
  const [bankPicked, setBankPicked] = useState<Set<number>>(new Set());

  useEffect(() => {
    setGen(null);
    setBankPicked(new Set());
    setAdded(null);
  }, [skill]);

  async function generate() {
    setBusy("gen");
    setError(null);
    setAdded(null);
    try {
      const r = await api<{ questions: GeneratedQuestion[] }>("/api/teacher/worksheet", { method: "POST", json: { skill, count, mix, notes: notes || undefined } });
      setGen(r.questions);
      setPicked(new Set(r.questions.map((_, i) => i)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addToBank() {
    if (!gen) return;
    setBusy("add");
    setError(null);
    try {
      const qs = gen.filter((_, i) => picked.has(i));
      const r = await api<{ added: number }>("/api/teacher/questions", { method: "POST", json: { questions: qs } });
      setAdded(t(`${r.added} questions added to the adaptive bank. Students will start seeing them.`, `${r.added} soalan ditambah ke bank adaptif. Murid akan mula melihatnya.`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const sheet: SheetQ[] =
    tab === "ai"
      ? (gen ?? [])
          .map((q, i) => ({ q, i }))
          .filter(({ i }) => picked.has(i))
          .map(({ q, i }) => ({
            key: `g${i}`,
            stem: sheetLang === "ms" ? q.stem_ms : q.stem_en,
            choices: q.choices.map((c) => c[sheetLang]),
            answer: `${"ABCD"[q.answer]}. ${q.choices[q.answer][sheetLang]}`,
            explanation: sheetLang === "ms" ? q.explanation_ms : q.explanation_en,
            difficulty: q.difficulty,
          }))
      : (bank.data ?? [])
          .filter((q) => bankPicked.has(q.id))
          .map((q) => ({
            key: `b${q.id}`,
            stem: q.stem,
            choices: q.choices,
            answer: q.choices ? `${"ABCD"[Number(q.answer)]}. ${q.choices[Number(q.answer)]}` : q.answer,
            difficulty: q.difficulty < -0.5 ? "easy" : q.difficulty > 0.5 ? "hard" : "medium",
          }));

  const diffLabel = (d: string) => ({ easy: t("Easy", "Mudah"), medium: t("Medium", "Sederhana"), hard: t("Hard", "Sukar") })[d] ?? d;

  return (
    <div className="space-y-5">
      <div className="no-print space-y-5">
        <PageHeader eyebrow={t("Quizzes & worksheets", "Kuiz & lembaran kerja")} title={t("Worksheet builder", "Pembina lembaran kerja")} />
        <div className="card space-y-4">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className="label" htmlFor="w-skill">{t("Topic", "Topik")}</label>
              <select id="w-skill" className="input" value={skill} onChange={(e) => setParams({ skill: e.target.value })}>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject === "math" ? t("Maths", "Mat") : t("Science", "Sains")} · {name(s.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="label">{t("Worksheet language", "Bahasa lembaran")}</p>
              <div className="flex gap-1.5">
                {(["ms", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setSheetLang(l)} aria-pressed={sheetLang === l} className={`chip ${sheetLang === l ? "!border-ink-800 !bg-ink-800 !text-white dark:!border-sun-400 dark:!bg-sun-400 dark:!text-ink-900" : ""}`}>
                    {l === "ms" ? "BM" : "EN"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="inline-flex rounded-full border border-ink-800/15 p-0.5 text-sm font-bold dark:border-white/15" role="tablist">
            <button role="tab" aria-selected={tab === "ai"} onClick={() => setTab("ai")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${tab === "ai" ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : ""}`}>
              <Sparkles className="h-4 w-4" /> {t("Generate new with AI", "Jana baharu dengan AI")}
            </button>
            <button role="tab" aria-selected={tab === "bank"} onClick={() => setTab("bank")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${tab === "bank" ? "bg-ink-800 text-white dark:bg-sun-400 dark:text-ink-900" : ""}`}>
              <Database className="h-4 w-4" /> {t("From question bank", "Dari bank soalan")}
            </button>
          </div>

          {tab === "ai" && (
            <div className="space-y-3">
              {!aiEnabled && <AiOffNotice />}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="w-count">{t("Questions", "Soalan")}</label>
                  <input id="w-count" type="number" min={3} max={10} className="input" value={count} onChange={(e) => setCount(Math.min(10, Math.max(3, Number(e.target.value))))} />
                </div>
                <div>
                  <label className="label" htmlFor="w-mix">{t("Difficulty", "Kesukaran")}</label>
                  <select id="w-mix" className="input" value={mix} onChange={(e) => setMix(e.target.value as typeof mix)}>
                    <option value="easy">{t("Mostly easy (remedial)", "Kebanyakan mudah (pemulihan)")}</option>
                    <option value="mixed">{t("Mixed", "Campuran")}</option>
                    <option value="hard">{t("Mostly hard (enrichment)", "Kebanyakan sukar (pengayaan)")}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="w-notes">{t("Focus (optional)", "Fokus (pilihan)")}</label>
                  <input id="w-notes" className="input" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("e.g. negative constants", "cth. pemalar negatif")} />
                </div>
              </div>
              <button className="btn-sun" onClick={generate} disabled={busy === "gen" || !aiEnabled}>
                {busy === "gen" ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {busy === "gen" ? t("Writing and checking questions…", "Menulis dan menyemak soalan…") : t("Generate questions", "Jana soalan")}
              </button>
              <p className="text-xs muted">
                {t(
                  "Every question is generated in English and BM with an answer and explanation, then checked for 4 distinct options and a single answer. Review them before printing or adding to the bank.",
                  "Setiap soalan dijana dalam BI dan BM dengan jawapan dan penerangan, kemudian disemak: 4 pilihan berbeza dan satu jawapan. Semak sebelum mencetak atau menambah ke bank.",
                )}
              </p>
            </div>
          )}
          {error && <ErrorNote message={error} />}
        </div>

        {tab === "ai" && gen && (
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">{t("Review generated questions", "Semak soalan yang dijana")}</h2>
              <button className="btn-primary !py-2" onClick={addToBank} disabled={!picked.size || busy === "add" || Boolean(added)}>
                {busy === "add" ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} {t(`Approve ${picked.size} for the adaptive bank`, `Luluskan ${picked.size} untuk bank adaptif`)}
              </button>
            </div>
            {added && <p className="mt-2 rounded-xl bg-mint-100 px-3 py-2 text-sm font-semibold text-mint-500 dark:bg-mint-400/15">{added}</p>}
            <ul className="mt-3 space-y-2">
              {gen.map((q, i) => (
                <li key={i} className="flex gap-3 rounded-2xl border border-paper-200 p-3 dark:border-white/8">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-ink-600" checked={picked.has(i)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; })} aria-label={t(`Include question ${i + 1}`, `Sertakan soalan ${i + 1}`)} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold"><MathText text={sheetLang === "ms" ? q.stem_ms : q.stem_en} /></p>
                    <ol className="mt-1 grid gap-x-4 sm:grid-cols-2">
                      {q.choices.map((c, j) => (
                        <li key={j} className={j === q.answer ? "font-bold text-mint-500" : ""}>
                          {"ABCD"[j]}. <MathText text={c[sheetLang]} />
                        </li>
                      ))}
                    </ol>
                    <p className="mt-1 text-xs muted"><MathText text={sheetLang === "ms" ? q.explanation_ms : q.explanation_en} /> · {diffLabel(q.difficulty)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "bank" && (
          <div className="card">
            <h2 className="text-lg font-extrabold">{name(skill)}: {t("question bank", "bank soalan")}</h2>
            <p className="text-sm muted">{t("Difficulty is calibrated from students' answers (Elo). Pick questions for a printable worksheet.", "Kesukaran ditentukur daripada jawapan murid (Elo). Pilih soalan untuk lembaran kerja bercetak.")}</p>
            {!bank.data ? (
              <PageLoader />
            ) : (
              <ul className="mt-3 space-y-2">
                {bank.data.map((q) => (
                  <li key={q.id} className="flex gap-3 rounded-2xl border border-paper-200 p-3 text-sm dark:border-white/8">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-ink-600" checked={bankPicked.has(q.id)} onChange={() => setBankPicked((p) => { const n = new Set(p); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })} aria-label={t("Include", "Sertakan")} />
                    <div className="min-w-0 flex-1">
                      <MathText text={q.stem} />
                      <p className="mt-0.5 text-xs muted">
                        {q.source === "ai" ? t("AI, teacher-approved", "AI, diluluskan guru") : t("Starter bank", "Bank asas")} · {t("difficulty", "kesukaran")} {q.difficulty > 0 ? "+" : ""}{q.difficulty}
                        {q.pctCorrect !== null && ` · ${q.pctCorrect}% ${t("correct", "betul")} (${q.attempts})`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {sheet.length > 0 && (
        <section className="card print-plain !p-6 sm:!p-8">
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{t("Printable worksheet", "Lembaran kerja bercetak")}</p>
            <div className="flex gap-2">
              <button className="chip" onClick={() => setShowKey((s) => !s)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showKey ? t("Hide answer key", "Sembunyi skema") : t("Show answer key", "Papar skema")}
              </button>
              <button className="btn-primary !py-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> {t("Print / PDF", "Cetak / PDF")}
              </button>
            </div>
          </div>
          <header className="border-b border-paper-200 pb-3 dark:border-white/8">
            <h2 className="text-2xl font-extrabold">
              {name(skill)}: {sheetLang === "ms" ? "Lembaran Kerja" : "Worksheet"}
            </h2>
            <p className="text-sm muted">
              {user?.className} · {sheetLang === "ms" ? "Nama" : "Name"}: ________________________ · {sheetLang === "ms" ? "Tarikh" : "Date"}: ____________
            </p>
          </header>
          <ol className="mt-4 space-y-5">
            {sheet.map((q, i) => (
              <li key={q.key} className="break-inside-avoid">
                <p className="font-semibold">
                  {i + 1}. <MathText text={q.stem} />
                </p>
                {q.choices ? (
                  <ol className="mt-1.5 grid gap-x-6 gap-y-1 pl-5 text-sm sm:grid-cols-2">
                    {q.choices.map((c, j) => (
                      <li key={j}>
                        {"ABCD"[j]}. <MathText text={c} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-6 border-b border-dashed border-ink-300 pl-5 text-sm muted">{sheetLang === "ms" ? "Jawapan:" : "Answer:"}</p>
                )}
              </li>
            ))}
          </ol>
          {showKey && (
            <div className="mt-8 border-t-2 border-dashed border-paper-200 pt-4 [break-before:page] dark:border-white/10">
              <h3 className="text-lg font-extrabold">{sheetLang === "ms" ? "Skema jawapan" : "Answer key"}</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {sheet.map((q, i) => (
                  <li key={q.key}>
                    <strong>{i + 1}.</strong> <MathText text={q.answer} />
                    {q.explanation && (
                      <span className="muted">
                        {" "}
                        · <MathText text={q.explanation} />
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
