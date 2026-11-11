import { ArrowRight, BarChart3, BookOpenCheck, Brain, Camera, CheckCircle2, ClipboardCheck, GraduationCap, Languages, MessageCircleQuestion, School, ShieldCheck, Target, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MathText } from "../components/MathText";
import { ErrorNote, LangToggle, Logo, Spinner, ThemeSwitch } from "../components/ui";
import { useLang } from "../lib/i18n";
import { useSession } from "../lib/session";

export function DemoButtons({ size = "lg" }: { size?: "lg" | "md" }) {
  const { t, lang } = useLang();
  const { startDemo } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"student" | "teacher" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function go(role: "student" | "teacher") {
    setBusy(role);
    setError(null);
    try {
      await startDemo(role, lang);
      navigate(role === "teacher" ? "/t" : "/s");
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }
  const pad = size === "lg" ? "!px-6 !py-3.5 text-base" : "";
  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button className={`btn-sun ${pad}`} onClick={() => go("student")} disabled={Boolean(busy)}>
          {busy === "student" ? <Spinner className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />} {t("Try as Student", "Cuba sebagai Murid")}
        </button>
        <button className={`btn ${pad} bg-white text-ink-900 hover:bg-ink-100`} onClick={() => go("teacher")} disabled={Boolean(busy)}>
          {busy === "teacher" ? <Spinner className="h-5 w-5" /> : <School className="h-5 w-5" />} {t("Try as Teacher", "Cuba sebagai Guru")}
        </button>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const { t } = useLang();
  const { user } = useSession();

  return (
    <div className="min-h-dvh">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo light className="text-white" />
          <nav className="flex items-center gap-2 text-sm font-bold text-white">
            <Link to="/methodology" className="hidden rounded-full px-3 py-2 hover:bg-white/10 sm:inline">
              {t("How it works", "Cara ia berfungsi")}
            </Link>
            <span className="[&_button]:!text-white [&_div]:!border-white/25 [&_[aria-pressed=true]]:!bg-sun-400 [&_[aria-pressed=true]]:!text-ink-900">
              <LangToggle />
            </span>
            {user ? (
              <Link to={user.role === "teacher" ? "/t" : "/s"} className="rounded-full border border-white/30 px-4 py-2 hover:bg-white/10">
                {t("Open app", "Buka aplikasi")}
              </Link>
            ) : (
              <Link to="/login" className="rounded-full border border-white/30 px-4 py-2 hover:bg-white/10">
                {t("Sign in", "Log masuk")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-800 pb-16 pt-28 text-white sm:pb-24 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-ink-500/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-sun-300">
              <Languages className="h-3.5 w-3.5" /> {t("Bilingual · KSSM Form 2 · AI + ML", "Dwibahasa · KSSM Tingkatan 2 · AI + ML")}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              {t("Every student learns at their own pace.", "Setiap murid belajar ikut rentak sendiri.")}{" "}
              <span className="text-sun-400">{t("Every teacher sees who needs help.", "Setiap guru nampak siapa perlukan bantuan.")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              {t(
                "CikguAI is a Socratic AI tutor, an adaptive practice engine and a teacher's assistant for Malaysian secondary schools, in Bahasa Melayu and English.",
                "CikguAI ialah tutor AI Sokratik, enjin latihan adaptif dan pembantu guru untuk sekolah menengah Malaysia, dalam Bahasa Melayu dan Bahasa Inggeris.",
              )}
            </p>
            <div className="mt-7">
              <DemoButtons />
            </div>
            <p className="mt-3 text-sm text-white/55">
              {t("One click, no sign-up. You get a private copy of a 25-student demo class.", "Satu klik, tanpa daftar. Anda dapat salinan peribadi kelas demo 25 murid.")}
            </p>
          </div>
          <HeroMock />
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="eyebrow">{t("The problem", "Masalahnya")}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-extrabold sm:text-4xl">
          {t("One teacher, thirty students, thirty different gaps.", "Seorang guru, tiga puluh murid, tiga puluh jurang berbeza.")}
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="card">
            <p className="font-display text-4xl font-extrabold text-coral-500">41%</p>
            <p className="mt-2 font-bold">{t("Learning gaps", "Jurang pembelajaran")}</p>
            <p className="mt-1 text-sm muted">
              {t(
                "of Malaysian 15-year-olds reached baseline maths proficiency in PISA 2022 (OECD average: 69%). In PISA 2025 the maths score fell again, to 397.",
                "remaja 15 tahun Malaysia mencapai tahap asas kemahiran matematik dalam PISA 2022 (purata OECD: 69%). Dalam PISA 2025, skor matematik jatuh lagi kepada 397.",
              )}
            </p>
            <p className="mt-3 text-xs muted">OECD PISA 2022 country note; PISA 2025 via The Star, 8 Sep 2026</p>
          </div>
          <div className="card">
            <p className="font-display text-4xl font-extrabold text-sun-500">
              <ClipboardCheck className="inline h-9 w-9" />
            </p>
            <p className="mt-2 font-bold">{t("Teacher workload", "Beban tugas guru")}</p>
            <p className="mt-1 text-sm muted">
              {t(
                "Marking, lesson planning and paperwork eat the hours teachers could spend with the students who need them most.",
                "Menanda, merancang pelajaran dan kerja perkeranian mengambil masa yang boleh digunakan untuk murid yang paling memerlukan.",
              )}
            </p>
          </div>
          <div className="card">
            <p className="font-display text-4xl font-extrabold text-ink-500">
              <Users className="inline h-9 w-9" />
            </p>
            <p className="mt-2 font-bold">{t("One-size-fits-all", "Satu saiz untuk semua")}</p>
            <p className="mt-1 text-sm muted">
              {t(
                "A class moves at one speed. Students who missed one step, like the signs in factorisation, quietly fall further behind every chapter after.",
                "Kelas bergerak pada satu kelajuan. Murid yang tertinggal satu langkah, seperti tanda dalam pemfaktoran, makin ketinggalan dalam setiap bab seterusnya.",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-paper-100 py-16 sm:py-20 dark:bg-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="eyebrow">{t("The solution", "Penyelesaiannya")}</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold sm:text-4xl">{t("Two sides, one loop.", "Dua sisi, satu kitaran.")}</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
                <GraduationCap className="h-5 w-5 text-ink-500" /> {t("For students (on their phones)", "Untuk murid (di telefon)")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Feature icon={MessageCircleQuestion} title={t("Socratic AI tutor", "Tutor AI Sokratik")} text={t("Hints and questions, not answers. Adapts to each student's mastery.", "Petunjuk dan soalan, bukan jawapan. Menyesuaikan dengan penguasaan murid.")} />
                <Feature icon={Camera} title={t("Photo diagnosis", "Diagnosis gambar")} text={t("Snap your working; it finds the exact step that went wrong.", "Ambil gambar jalan kerja; ia cari langkah yang silap.")} />
                <Feature icon={Target} title={t("Adaptive quizzes", "Kuiz adaptif")} text={t("Each question is picked for your weakest skill at the right difficulty.", "Setiap soalan dipilih untuk kemahiran paling lemah pada tahap yang sesuai.")} />
                <Feature icon={BarChart3} title={t("Streaks, XP, badges", "Rentetan, XP, lencana")} text={t("Daily goals and a class board that rewards effort, not just marks.", "Matlamat harian dan papan kelas yang menghargai usaha.")} />
              </div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
                <School className="h-5 w-5 text-coral-500" /> {t("For teachers (on any device)", "Untuk guru (di mana-mana peranti)")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Feature icon={ClipboardCheck} title={t("AI-assisted marking", "Penandaan dibantu AI")} text={t("Rubric-based grades with feedback and confidence. You approve every one.", "Gred berasaskan rubrik dengan maklum balas dan keyakinan. Anda luluskan setiap satu.")} />
                <Feature icon={Users} title={t("Class insights", "Analisis kelas")} text={t("Mastery heatmap, at-risk students and misconceptions shared across the class.", "Peta haba penguasaan, murid berisiko dan salah faham yang dikongsi.")} />
                <Feature icon={BookOpenCheck} title={t("Lesson planner", "Perancang pelajaran")} text={t("KSSM-aligned plans built around your class's data. Edit, export to Word or PDF.", "Rancangan selaras KSSM berdasarkan data kelas anda. Sunting, eksport ke Word atau PDF.")} />
                <Feature icon={Brain} title={t("Worksheets in one click", "Lembaran kerja satu klik")} text={t("Bilingual questions with answer keys; approve the best into the adaptive bank.", "Soalan dwibahasa dengan skema; luluskan yang terbaik ke bank adaptif.")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI + ML */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">{t("How AI and ML are used", "Bagaimana AI dan ML digunakan")}</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t("Machine learning decides what to practise. AI explains it.", "Pembelajaran mesin tentukan apa untuk dilatih. AI menerangkannya.")}</h2>
            <p className="mt-4 muted">
              {t(
                "Mastery and question choice come from transparent, testable models, not from a chatbot's guess. Claude does what it's good at: explaining, diagnosing, grading against a rubric and drafting plans, and a teacher stays in control.",
                "Penguasaan dan pilihan soalan datang daripada model yang telus dan boleh diuji, bukan tekaan chatbot. Claude melakukan apa yang ia mahir: menerang, mendiagnosis, menggred berdasarkan rubrik dan mendraf rancangan, dan guru tetap memegang kawalan.",
              )}
            </p>
            <Link to="/methodology" className="mt-5 inline-flex items-center gap-1 font-bold text-ink-500 dark:text-sun-400">
              {t("Read the methodology", "Baca metodologi")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ol className="space-y-3">
            {[
              [t("Bayesian Knowledge Tracing", "Penjejakan Pengetahuan Bayesian"), t("Updates the probability each student has mastered each of 13 KSSM skills after every answer.", "Mengemas kini kebarangkalian murid telah menguasai setiap 13 kemahiran KSSM selepas setiap jawapan.")],
              [t("Elo ability and difficulty ratings", "Penarafan Elo untuk kebolehan dan kesukaran"), t("Calibrates every question from real answers and serves the one each student has about a 70% chance of getting right.", "Menentukur setiap soalan daripada jawapan sebenar dan memilih soalan dengan peluang betul kira-kira 70%.")],
              [t("Misconception tagging", "Penandaan salah faham"), t("Wrong options carry the misconception they reveal, so the class dashboard counts real patterns.", "Pilihan salah ditandakan dengan salah faham yang didedahkan, supaya papan pemuka mengira corak sebenar.")],
              [t("Claude (vision + language)", "Claude (penglihatan + bahasa)"), t("Socratic tutoring, photo diagnosis, rubric grading with schema-validated output, class summaries and lesson plans.", "Tutor Sokratik, diagnosis gambar, penggredan rubrik dengan output disahkan skema, ringkasan kelas dan rancangan pelajaran.")],
            ].map(([title, text], i) => (
              <li key={i} className="card flex gap-4 !p-4">
                <span className="font-display text-2xl font-extrabold text-sun-500">{i + 1}</span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Impact */}
      <section className="bg-ink-800 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sun-300">{t("Impact", "Impak")}</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold sm:text-4xl">{t("Close gaps early, give teachers time back.", "Rapatkan jurang awal, kembalikan masa kepada guru.")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [t("Gaps found in days, not exams", "Jurang dikesan dalam hari, bukan peperiksaan"), t("Misconceptions surface from everyday practice, so the remedial group happens this week, not after the exam.", "Salah faham timbul daripada latihan harian, jadi kumpulan pemulihan berlaku minggu ini, bukan selepas peperiksaan.")],
              [t("Marking becomes reviewing", "Menanda menjadi menyemak"), t("Teachers confirm or adjust an evidence-backed draft instead of starting from a blank script.", "Guru mengesahkan atau melaraskan draf berbukti, bukan bermula dari kosong.")],
              [t("Built for Malaysian classrooms", "Dibina untuk bilik darjah Malaysia"), t("KSSM topics, BM and English, mobile-first and light on data for students on prepaid phones.", "Topik KSSM, BM dan BI, mesra telefon dan jimat data untuk murid dengan telefon prabayar.")],
            ].map(([title, text], i) => (
              <div key={i} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <CheckCircle2 className="h-6 w-6 text-sun-400" />
                <p className="mt-3 font-display text-lg font-bold">{title}</p>
                <p className="mt-1 text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <DemoButtons />
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-6">
        <Logo />
        <div className="flex flex-wrap items-center gap-4 muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> {t("Teachers approve every grade", "Guru meluluskan setiap gred")}
          </span>
          <Link to="/methodology" className="font-bold text-ink-500 dark:text-sun-400">
            {t("Methodology & responsible AI", "Metodologi & AI bertanggungjawab")}
          </Link>
          <a href="/CikguAI-pitch.pdf" className="font-bold text-ink-500 dark:text-sun-400">
            {t("Pitch summary (PDF)", "Ringkasan pitch (PDF)")}
          </a>
          <ThemeSwitch />
        </div>
        <p className="w-full text-center muted">Copyright © 2026</p>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Brain; title: string; text: string }) {
  return (
    <div className="card !p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-800 text-sun-400 dark:bg-sun-400 dark:text-ink-900">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2 font-bold">{title}</p>
      <p className="text-sm muted">{text}</p>
    </div>
  );
}

function HeroMock() {
  const { t } = useLang();
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="rotate-[-1.5deg] rounded-[2rem] bg-white p-5 text-ink-900 shadow-2xl">
        <p className="text-xs font-extrabold uppercase tracking-widest text-ink-500">{t("Factorisation · Q3 of 5", "Pemfaktoran · S3 daripada 5")}</p>
        <p className="mt-2 text-lg font-semibold">
          <MathText text={t("Factorise $x^2 - x - 12$", "Faktorkan $x^2 - x - 12$")} />
        </p>
        <div className="mt-3 grid gap-2 text-sm font-semibold">
          <div className="flex items-center gap-2 rounded-xl border-2 border-coral-400 bg-coral-100 px-3 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-coral-400 text-xs text-white">✕</span>
            <MathText text="$(x + 4)(x - 3)$" />
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-mint-400 bg-mint-100 px-3 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-mint-400 text-xs text-white">✓</span>
            <MathText text="$(x - 4)(x + 3)$" />
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-paper-100 px-3 py-2 text-xs">
          <strong>{t("Common slip:", "Kesilapan biasa:")}</strong> {t("Sign errors when factorising quadratics", "Kesilapan tanda semasa memfaktorkan")}
        </p>
      </div>
      <div className="relative -mt-4 ml-8 rotate-[1.5deg] rounded-[1.75rem] rounded-bl-md bg-sun-400 p-4 text-sm text-ink-900 shadow-xl">
        <p className="font-extrabold">CikguAI</p>
        <p className="mt-1">
          <MathText
            text={t(
              "Nearly! Your numbers multiply to $-12$ ✓. Now check the sum: does $+4 + (-3)$ give the middle term $-1$?",
              "Hampir! Nombor anda darab jadi $-12$ ✓. Sekarang semak hasil tambah: adakah $+4 + (-3)$ memberi sebutan tengah $-1$?",
            )}
          />
        </p>
      </div>
      <div className="absolute -right-3 -top-7 rotate-[3deg] rounded-2xl bg-white px-4 py-3 text-ink-900 shadow-xl ring-1 ring-ink-100">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-500">{t("Mastery", "Penguasaan")}</p>
        <p className="font-display text-xl font-extrabold">
          12% → <span className="text-mint-500">73%</span>
        </p>
      </div>
    </div>
  );
}
