import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MathText } from "../components/MathText";
import { LangToggle, Logo, ThemeSwitch } from "../components/ui";
import { useLang, useSkills } from "../lib/i18n";
import { useSession } from "../lib/session";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-paper-200 pt-8 dark:border-white/8">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">{children}</div>
    </section>
  );
}

const M = ({ children }: { children: string }) => <MathText text={children} />;

export default function Methodology() {
  const { t, bi } = useLang();
  const { curriculum } = useSession();
  const { skills, name } = useSkills();
  const m = curriculum?.model;

  const toc: [string, string][] = [
    ["curriculum", t("Curriculum map", "Peta kurikulum")],
    ["bkt", t("Knowledge tracing", "Penjejakan pengetahuan")],
    ["elo", t("Difficulty & question choice", "Kesukaran & pilihan soalan")],
    ["path", t("Learning path", "Laluan pembelajaran")],
    ["misconceptions", t("Misconceptions", "Salah faham")],
    ["tutor", t("The AI tutor", "Tutor AI")],
    ["grading", t("Grading & human review", "Penggredan & semakan manusia")],
    ["teacher", t("Teacher insights & planning", "Analisis & perancangan guru")],
    ["responsible", t("Responsible AI", "AI bertanggungjawab")],
    ["limits", t("Limitations", "Had")],
    ["sources", t("Sources", "Sumber")],
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-paper-200 bg-paper-50/90 backdrop-blur dark:border-white/8 dark:bg-ink-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold muted hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t("Home", "Utama")}
        </Link>
        <p className="eyebrow mt-6">{t("Methodology", "Metodologi")}</p>
        <h1 className="mt-1 text-4xl font-extrabold">{t("How CikguAI works, and where it can be wrong", "Cara CikguAI berfungsi, dan di mana ia boleh silap")}</h1>
        <p className="mt-3 max-w-3xl text-lg muted">
          {t(
            "Two kinds of intelligence work together. Transparent statistical models decide how well each student knows each skill and what to practise next. A large language model (Claude, by Anthropic) explains, diagnoses, grades against rubrics and drafts plans. A teacher reviews anything that counts.",
            "Dua jenis kecerdasan bekerjasama. Model statistik yang telus menentukan sejauh mana murid menguasai setiap kemahiran dan apa yang perlu dilatih seterusnya. Model bahasa besar (Claude, oleh Anthropic) menerang, mendiagnosis, menggred berdasarkan rubrik dan mendraf rancangan. Guru menyemak apa sahaja yang penting.",
          )}
        </p>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("Contents", "Kandungan")}>
          {toc.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="chip !text-xs">
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-10">
          <Section id="curriculum" title={t("1. Curriculum map", "1. Peta kurikulum")}>
            <p>
              {t(
                "The first release covers 13 skills from KSSM Form 2 Mathematics and Science, named and numbered as in the KSSM Form 2 textbooks. Each skill has a starter bank of 10–11 bilingual questions written and checked by the team (automated tests check every item has one correct answer, four distinct options and Malay text). Prerequisites drive the learning path.",
                "Keluaran pertama merangkumi 13 kemahiran daripada Matematik dan Sains KSSM Tingkatan 2, dinamakan dan dinomborkan seperti buku teks KSSM Tingkatan 2. Setiap kemahiran mempunyai bank asas 10–11 soalan dwibahasa yang ditulis dan disemak oleh pasukan (ujian automatik memastikan setiap soalan ada satu jawapan betul, empat pilihan berbeza dan teks BM). Prasyarat memacu laluan pembelajaran.",
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs muted">
                  <tr>
                    <th className="py-1.5">{t("Subject", "Subjek")}</th>
                    <th>{t("Chapter", "Bab")}</th>
                    <th>{t("Skill", "Kemahiran")}</th>
                    <th>{t("Builds on", "Berasaskan")}</th>
                    <th>{t("Questions", "Soalan")}</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((s) => (
                    <tr key={s.id} className="border-t border-paper-200 dark:border-white/8">
                      <td className="py-1.5">{bi(curriculum?.subjects[s.subject])}</td>
                      <td>{s.chapter}</td>
                      <td className="font-semibold">{name(s.id)}</td>
                      <td>{s.prereqs.map(name).join(", ") || "–"}</td>
                      <td>{s.questions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="bkt" title={t("2. Knowledge tracing: how mastery is estimated", "2. Penjejakan pengetahuan: cara penguasaan dianggarkan")}>
            <p>
              {t(
                "Each student has a probability of mastery for each skill, updated after every answer with Bayesian Knowledge Tracing (Corbett & Anderson, 1995). After a correct answer:",
                "Setiap murid mempunyai kebarangkalian penguasaan bagi setiap kemahiran, dikemas kini selepas setiap jawapan dengan Penjejakan Pengetahuan Bayesian (Corbett & Anderson, 1995). Selepas jawapan betul:",
              )}
            </p>
            <p className="overflow-x-auto rounded-2xl bg-white p-4 text-center dark:bg-ink-900">
              <M>{String.raw`$$P(L \mid \text{correct}) = \frac{P(L)(1-S)}{P(L)(1-S) + (1-P(L))\,G}$$`}</M>
            </p>
            <p>{t("After a wrong answer:", "Selepas jawapan salah:")}</p>
            <p className="overflow-x-auto rounded-2xl bg-white p-4 text-center dark:bg-ink-900">
              <M>{String.raw`$$P(L \mid \text{wrong}) = \frac{P(L)\,S}{P(L)\,S + (1-P(L))(1-G)}$$`}</M>
            </p>
            <p>{t("Then the chance of learning from the practice opportunity is added:", "Kemudian peluang belajar daripada latihan itu ditambah:")}</p>
            <p className="overflow-x-auto rounded-2xl bg-white p-4 text-center dark:bg-ink-900">
              <M>{String.raw`$$P(L_{t+1}) = P(L \mid \text{obs}) + \big(1 - P(L \mid \text{obs})\big)\,T$$`}</M>
            </p>
            {m && (
              <ul>
                <li>
                  <M>{`$P(L_0) = ${m.pInit}$`}</M>: {t("prior chance a student already knows a new skill", "kebarangkalian awal murid sudah tahu kemahiran baharu")}
                </li>
                <li>
                  <M>{`$T = ${m.pLearn}$`}</M>: {t("chance of learning from each practice opportunity", "peluang belajar daripada setiap latihan")}
                </li>
                <li>
                  <M>{`$S = ${m.pSlip}$`}</M>: {t("slip: knows it but answers wrongly", "tergelincir: tahu tetapi tersalah jawab")}
                </li>
                <li>
                  <M>{`$G = ${m.pGuessMcq}$`}</M> {t("for 4-option multiple choice and", "untuk aneka pilihan 4 opsyen dan")} <M>{`$G = ${m.pGuessNum}$`}</M> {t("for typed numeric answers (guessing a number is much harder)", "untuk jawapan nombor yang ditaip (meneka nombor jauh lebih sukar)")}
                </li>
                <li>
                  {t("“Mastered” means", "“Dikuasai” bermaksud")} <M>{`$P(L) \\ge ${m.masteredAt}$`}</M> {t(`and at least ${m.minAttemptsForMastery} answers, so a lucky streak of guesses can't count. The estimate is capped at 0.99 so one slip after a long streak still moves it.`, `dan sekurang-kurangnya ${m.minAttemptsForMastery} jawapan, supaya tekaan bertuah tidak dikira. Anggaran dihadkan pada 0.99 supaya satu kesilapan selepas rentetan panjang masih memberi kesan.`)}
                </li>
              </ul>
            )}
            <p className="rounded-2xl bg-sun-100 p-4 text-sm dark:bg-sun-400/10">
              <strong>{t("Worked example: ", "Contoh: ")}</strong>
              {t(
                "a student at 12% on Factorisation who answers three multiple-choice questions correctly moves to about 39%, 73%, then 91%. That's why mastery visibly rises during the demo, and why one lucky guess alone doesn't make a student 'mastered'.",
                "murid pada 12% untuk Pemfaktoran yang menjawab tiga soalan aneka pilihan dengan betul naik ke kira-kira 39%, 73%, kemudian 91%. Sebab itu penguasaan meningkat dengan jelas dalam demo, dan satu tekaan bertuah sahaja tidak menjadikan murid 'menguasai'.",
              )}
            </p>
          </Section>

          <Section id="elo" title={t("3. Question difficulty and choosing the next question", "3. Kesukaran soalan dan memilih soalan seterusnya")}>
            <p>
              {t(
                "BKT says how well a skill is known; it doesn't say which question to ask. For that, every student-skill pair has an ability rating θ and every question a difficulty b on the same logit scale (an Elo-style Rasch model, as used in adaptive practice systems; Pelánek, 2016):",
                "BKT menunjukkan tahap penguasaan; ia tidak menentukan soalan mana untuk ditanya. Untuk itu, setiap pasangan murid-kemahiran ada penarafan kebolehan θ dan setiap soalan ada kesukaran b pada skala logit yang sama (model Rasch gaya Elo, seperti dalam sistem latihan adaptif; Pelánek, 2016):",
              )}
            </p>
            <p className="overflow-x-auto rounded-2xl bg-white p-4 text-center dark:bg-ink-900">
              <M>{String.raw`$$P(\text{correct}) = \sigma(\theta - b) = \frac{1}{1+e^{-(\theta-b)}}, \quad \theta \leftarrow \theta + K_s\,(y - P), \quad b \leftarrow b - K_q\,(y - P)$$`}</M>
            </p>
            <ul>
              <li>{t("K shrinks as evidence grows (students: 0.8/(1 + 0.08n), floor 0.15; questions: 0.4/(1 + 0.05n), floor 0.03), so new ratings move fast and settle down.", "K mengecil apabila bukti bertambah (murid: 0.8/(1 + 0.08n), minimum 0.15; soalan: 0.4/(1 + 0.05n), minimum 0.03), jadi penarafan baharu bergerak pantas kemudian stabil.")}</li>
              <li>{t("Starter questions begin at a difficulty the authors set (easy −1.5 to hard +1.8); after that, difficulty is learned from real answers. Teachers see the calibrated difficulty and % correct in the question bank.", "Soalan asas bermula pada kesukaran yang ditetapkan penulis (mudah −1.5 hingga sukar +1.8); selepas itu, kesukaran dipelajari daripada jawapan sebenar. Guru boleh melihat kesukaran yang ditentukur dan % betul dalam bank soalan.")}</li>
              <li>
                {t("The next question is the one, among those not seen in the last 25, whose predicted success is closest to", "Soalan seterusnya ialah soalan, antara yang tidak dilihat dalam 25 soalan terakhir, yang ramalan kejayaannya paling hampir dengan")}{" "}
                <strong>{Math.round((m?.targetSuccess ?? 0.7) * 100)}%</strong>
                {t(": hard enough to learn from, easy enough to stay motivated.", ": cukup mencabar untuk belajar, cukup mudah untuk kekal bermotivasi.")}
              </li>
            </ul>
          </Section>

          <Section id="path" title={t("4. The learning path: “your next 3 things to study”", "4. Laluan pembelajaran: “3 perkara seterusnya”")}>
            <ul>
              <li>{t("Priority starts from weakness (1 − mastery), plus a boost if 2+ of the last 5 answers on that skill were wrong.", "Keutamaan bermula daripada kelemahan (1 − penguasaan), ditambah jika 2+ daripada 5 jawapan terakhir bagi kemahiran itu salah.")}</li>
              <li>{t("Skills that unlock others (e.g. Expansion → Factorisation) get a boost; a skill whose prerequisite is below 60% is held back, so foundations are fixed first.", "Kemahiran yang membuka kemahiran lain (cth. Kembangan → Pemfaktoran) diberi keutamaan; kemahiran yang prasyaratnya di bawah 60% ditangguhkan supaya asas dibaiki dahulu.")}</li>
              <li>{t("Mastered skills come back for spaced review after 10 days without practice.", "Kemahiran yang dikuasai kembali untuk ulang kaji berjarak selepas 10 hari tanpa latihan.")}</li>
              <li>{t("Every recommendation shows its reasons to the student, in their language.", "Setiap cadangan menunjukkan sebabnya kepada murid, dalam bahasa mereka.")}</li>
            </ul>
          </Section>

          <Section id="misconceptions" title={t("5. Detecting misconceptions without guessing", "5. Mengesan salah faham tanpa meneka")}>
            <p>
              {t(
                "Wrong options in the bank are tagged with the misconception they reveal, for example choosing (x + 4)(x − 3) for x² − x − 12 is a sign error. The class dashboard only counts a misconception for a student once they've repeated it at least 3 times in 30 days, so one careless slip isn't labelled a pattern. This is deterministic counting, not AI judgement, so a teacher can trace every number back to answers.",
                "Pilihan salah dalam bank ditandakan dengan salah faham yang didedahkannya, contohnya memilih (x + 4)(x − 3) untuk x² − x − 12 ialah kesilapan tanda. Papan pemuka kelas hanya mengira salah faham bagi murid yang mengulanginya sekurang-kurangnya 3 kali dalam 30 hari, jadi satu kecuaian tidak dilabel sebagai corak. Ini kiraan deterministik, bukan pertimbangan AI, jadi guru boleh menjejak setiap nombor kembali kepada jawapan.",
              )}
            </p>
          </Section>

          <Section id="tutor" title={t("6. The AI tutor", "6. Tutor AI")}>
            <ul>
              <li>{t("Model: Claude (claude-opus-5-5) via the Anthropic API, streamed for a fast first word. Each turn includes the student's current mastery estimates, so explanations adapt (simpler steps and local examples for low mastery, brief and challenging for high).", "Model: Claude (claude-opus-5-5) melalui API Anthropic, distrimkan untuk respons pantas. Setiap giliran menyertakan anggaran penguasaan murid, jadi penerangan menyesuaikan diri (langkah lebih mudah dan contoh tempatan untuk penguasaan rendah, ringkas dan mencabar untuk tinggi).")}</li>
              <li>{t("Socratic by instruction: one guiding question at a time, hint before explanation, explanation before a full worked answer. When a student arrives from a wrong quiz answer, the tutor gets the question, their choice, the tagged misconception and the correct answer, and is told to lead them there rather than reveal it.", "Sokratik mengikut arahan: satu soalan pandu pada satu masa, petunjuk sebelum penerangan, penerangan sebelum jawapan penuh. Apabila murid datang daripada jawapan kuiz yang salah, tutor menerima soalan, pilihan murid, salah faham yang ditanda dan jawapan betul, dan diarah untuk membimbing, bukan mendedahkan.")}</li>
              <li>{t("Photos are re-encoded on the server (EXIF and GPS removed, max 1400 px) before Claude reads them to find the step where reasoning went wrong.", "Gambar dikodkan semula di pelayan (EXIF dan GPS dibuang, maksimum 1400 px) sebelum Claude membacanya untuk mencari langkah yang silap.")}</li>
              <li>{t("Integrity and safety: it won't hand over answers to graded work, stays on schoolwork, keeps language age-appropriate, never asks for personal details, and points students who share something worrying to a trusted adult or Talian Kasih 15999.", "Integriti dan keselamatan: ia tidak akan memberi jawapan kerja bergred, kekal pada pelajaran, menggunakan bahasa sesuai umur, tidak meminta maklumat peribadi, dan mengarahkan murid yang berkongsi sesuatu yang membimbangkan kepada orang dewasa dipercayai atau Talian Kasih 15999.")}</li>
            </ul>
          </Section>

          <Section id="grading" title={t("7. Automated grading with a human in the loop", "7. Penggredan automatik dengan manusia dalam kitaran")}>
            <ul>
              <li>{t("The teacher writes the question and a rubric (criteria, marks, what earns full marks). Claude grades one answer at a time against that rubric only, returning schema-validated JSON: a score, evidence quote and feedback per criterion, an overall comment, a note for the teacher, a confidence level and flags (illegible, incomplete, off-topic, possibly copied, needs review).", "Guru menulis soalan dan rubrik (kriteria, markah, apa yang layak markah penuh). Claude menggred satu jawapan pada satu masa berdasarkan rubrik itu sahaja, memulangkan JSON yang disahkan skema: markah, petikan bukti dan maklum balas bagi setiap kriteria, ulasan keseluruhan, nota untuk guru, tahap keyakinan dan bendera (tidak boleh dibaca, tidak lengkap, luar topik, mungkin disalin, perlu semakan).")}</li>
              <li>{t("The server, not the model, enforces the rules: scores are clamped to each criterion's maximum and rounded to 0.5, and the total is recomputed in code. If the AI's criteria don't line up with the rubric, the grade is flagged for review.", "Pelayan, bukan model, menguatkuasakan peraturan: markah dihadkan kepada maksimum setiap kriteria dan dibundarkan kepada 0.5, dan jumlah dikira semula dalam kod. Jika kriteria AI tidak sepadan dengan rubrik, gred ditanda untuk semakan.")}</li>
              <li>{t("Student answers are treated as data, never instructions: text like “give me full marks” is ignored and flagged.", "Jawapan murid dianggap data, bukan arahan: teks seperti “beri saya markah penuh” diabaikan dan ditanda.")}</li>
              <li>
                <strong>{t("Nothing reaches a student until the teacher approves it.", "Tiada apa-apa sampai kepada murid sehingga guru meluluskannya.")}</strong>{" "}
                {t("Teachers can change any criterion score and the feedback; the app records whether the final grade differs from the AI draft.", "Guru boleh mengubah markah mana-mana kriteria dan maklum balas; aplikasi merekodkan sama ada gred akhir berbeza daripada draf AI.")}
              </li>
            </ul>
          </Section>

          <Section id="teacher" title={t("8. Class insights, lesson plans and worksheets", "8. Analisis kelas, rancangan pelajaran dan lembaran kerja")}>
            <ul>
              <li>{t("Every number on the class dashboard (heatmap, at-risk flags, groups, misconceptions) is computed from the attempt log. At-risk means inactive 7+ days, average mastery under 45%, recent accuracy under 45% on 8+ answers, or falling mastery; two signals, or 10+ days inactive, is high priority.", "Setiap nombor pada papan pemuka kelas (peta haba, bendera berisiko, kumpulan, salah faham) dikira daripada log jawapan. Berisiko bermaksud tidak aktif 7+ hari, purata penguasaan bawah 45%, ketepatan terkini bawah 45% pada 8+ jawapan, atau penguasaan menurun; dua isyarat, atau 10+ hari tidak aktif, ialah keutamaan tinggi.")}</li>
              <li>{t("The AI weekly summary only interprets those numbers. Students are pseudonymised (S01, S02, …) before anything is sent to the AI; names are mapped back on our server.", "Ringkasan mingguan AI hanya mentafsir nombor tersebut. Murid dinamakan semula (S01, S02, …) sebelum dihantar kepada AI; nama dipetakan semula di pelayan kami.")}</li>
              <li>{t("Lesson plans are KSSM-aligned, structured (objectives, timed phases that add up to the lesson length, support and extension, misconceptions, exit ticket) and can include the class's mastery and misconceptions for that topic, without names. Teachers edit everything and export to Word or PDF.", "Rancangan pelajaran selaras KSSM, berstruktur (objektif, fasa bermasa yang menjumlah tempoh pelajaran, sokongan dan pengayaan, salah faham, tiket keluar) dan boleh menyertakan penguasaan dan salah faham kelas bagi topik itu, tanpa nama. Guru boleh menyunting semuanya dan mengeksport ke Word atau PDF.")}</li>
              <li>{t("Generated questions are bilingual and validated in code (exactly 4 distinct options, one correct index). They only join the adaptive bank after a teacher approves them, and start at a difficulty matching the AI's label until real answers recalibrate them.", "Soalan yang dijana adalah dwibahasa dan disahkan dalam kod (tepat 4 pilihan berbeza, satu indeks betul). Ia hanya masuk ke bank adaptif selepas guru meluluskannya, dan bermula pada kesukaran mengikut label AI sehingga jawapan sebenar menentukurnya semula.")}</li>
            </ul>
          </Section>

          <Section id="responsible" title={t("9. Responsible AI", "9. AI bertanggungjawab")}>
            <ul>
              <li>
                <strong>{t("Teachers stay in charge.", "Guru tetap berkuasa.")}</strong> {t("CikguAI drafts; teachers decide. It is designed to give teachers time for the students who need them, not to replace teaching.", "CikguAI mendraf; guru memutuskan. Ia direka untuk memberi guru masa bagi murid yang memerlukan, bukan menggantikan pengajaran.")}
              </li>
              <li>
                <strong>{t("Privacy.", "Privasi.")}</strong>{" "}
                {t(
                  "Minimal data: name, class and learning records. Photos are stripped of location data and stored privately, viewable only by the student and their teacher. Teachers see how often a student used the tutor per topic, not the conversations. Sent to the AI: question text, answers and anonymised class statistics; no emails. Under Anthropic's commercial terms, API inputs aren't used to train models by default.",
                  "Data minimum: nama, kelas dan rekod pembelajaran. Gambar dibuang data lokasi dan disimpan secara peribadi, hanya boleh dilihat oleh murid dan gurunya. Guru nampak kekerapan murid menggunakan tutor bagi setiap topik, bukan perbualan. Dihantar kepada AI: teks soalan, jawapan dan statistik kelas tanpa nama; tiada e-mel. Di bawah terma komersial Anthropic, input API tidak digunakan untuk melatih model secara lalai.",
                )}
              </li>
              <li>
                <strong>{t("Fairness and bias.", "Keadilan dan bias.")}</strong>{" "}
                {t(
                  "Grading is rubric-only and told to ignore language choice, spelling and handwriting quality when meaning is clear, which matters for students writing in BM, English or a mix. Low-confidence grades are flagged. Teachers should spot-check AI grades across groups, and the override record makes that possible.",
                  "Penggredan hanya berdasarkan rubrik dan diarah mengabaikan pilihan bahasa, ejaan dan tulisan tangan apabila maksud jelas, penting bagi murid yang menulis dalam BM, BI atau campuran. Gred berkeyakinan rendah ditanda. Guru patut menyemak rawak gred AI merentas kumpulan, dan rekod pengubahan memudahkannya.",
                )}
              </li>
              <li>
                <strong>{t("Effort over rank.", "Usaha mengatasi kedudukan.")}</strong> {t("XP rewards every answer and the class board resets weekly, so weaker students can still lead.", "XP diberi untuk setiap jawapan dan papan kelas bermula semula setiap minggu, jadi murid lemah masih boleh mendahului.")}
              </li>
            </ul>
          </Section>

          <Section id="limits" title={t("10. Limitations", "10. Had")}>
            <ul>
              <li>{t("Demo data is synthetic. The 25-student class is simulated through the real engine (students with hidden abilities answering real questions over 6 weeks), so dashboards behave realistically, but no real students are involved and outcomes have not been measured in schools.", "Data demo adalah sintetik. Kelas 25 murid disimulasikan melalui enjin sebenar (murid dengan kebolehan tersembunyi menjawab soalan sebenar selama 6 minggu), jadi papan pemuka berkelakuan realistik, tetapi tiada murid sebenar terlibat dan hasil belum diukur di sekolah.")}</li>
              <li>{t("Standard BKT assumes skills are independent, students don't forget, and parameters are the same for everyone. We use fixed literature-style parameters rather than fitting them per skill; with real data they should be fitted (e.g. by expectation-maximisation).", "BKT standard menganggap kemahiran tidak bersandar, murid tidak lupa, dan parameter sama untuk semua. Kami menggunakan parameter tetap gaya literatur dan bukan dipadankan bagi setiap kemahiran; dengan data sebenar ia patut dipadankan (cth. melalui jangkaan-pemaksimuman).")}</li>
              <li>{t("Scope is 13 Form 2 skills with about 130 starter questions; the structure supports more forms and subjects.", "Skop ialah 13 kemahiran Tingkatan 2 dengan kira-kira 130 soalan asas; struktur menyokong lebih banyak tingkatan dan subjek.")}</li>
              <li>{t("AI output can be wrong, especially arithmetic in generated questions or reading messy handwriting. That's why grades and new questions need teacher approval, and why mastery never depends on the AI.", "Output AI boleh silap, terutamanya aritmetik dalam soalan yang dijana atau membaca tulisan tangan yang tidak kemas. Sebab itu gred dan soalan baharu memerlukan kelulusan guru, dan penguasaan tidak bergantung pada AI.")}</li>
              <li>{t("Malay translations were written by the team and the AI, not certified by the Ministry of Education.", "Terjemahan BM ditulis oleh pasukan dan AI, tidak disahkan oleh Kementerian Pendidikan.")}</li>
            </ul>
          </Section>

          <Section id="sources" title={t("11. Sources", "11. Sumber")}>
            <ul className="text-sm">
              <li>Corbett, A. T. & Anderson, J. R. (1995). Knowledge tracing: Modeling the acquisition of procedural knowledge. <em>User Modeling and User-Adapted Interaction</em>, 4, 253–278.</li>
              <li>Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. <em>Computers & Education</em>, 98, 169–179.</li>
              <li>{t("Ministry of Education Malaysia, KSSM Form 2 Mathematics and Science textbooks (chapter structure).", "Kementerian Pendidikan Malaysia, buku teks KSSM Matematik dan Sains Tingkatan 2 (struktur bab).")}</li>
              <li>OECD (2023). PISA 2022 Results, Country Note: Malaysia. {t("41% of students reached at least Level 2 in mathematics (OECD average 69%).", "41% murid mencapai sekurang-kurangnya Tahap 2 dalam matematik (purata OECD 69%).")}</li>
              <li>The Star (8 Sep 2026). “Pisa 2025: Malaysian teens score better in Science, Reading but decline in Maths”: {t("mathematics 397, down 11 points.", "matematik 397, turun 11 mata.")}</li>
              <li>Anthropic. Claude API documentation (structured outputs, vision, streaming).</li>
            </ul>
          </Section>
        </div>
      </main>
    </div>
  );
}
