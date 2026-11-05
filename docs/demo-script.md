# CikguAI: 3-minute demo script

**Story:** a student gets a wrong answer → the tutor diagnoses the gap → an adaptive quiz targets it → mastery rises → the teacher sees it on the class dashboard → the teacher generates a lesson plan.

**Setup (before you present)**
- Open https://challenge2.rohaizat.cloud on a laptop (presenter view), browser zoom 110%. Optionally mirror a phone for the student part.
- Click **Try as Student** once beforehand to warm up. Each click creates a fresh private demo class, so the live demo starts clean.
- Check `https://challenge2.rohaizat.cloud/api/health` shows `"ai":true`.
- Keep a second tab on `/methodology` for questions.

| Time | Screen | What to click | What to say |
|---|---|---|---|
| 0:00–0:20 | Landing | Scroll the hero and problem cards briefly | "In PISA 2022, only 41% of Malaysian 15-year-olds reached baseline maths. In one class of thirty, every student has a different gap, and the teacher can't see them until the exam. CikguAI is a bilingual tutor for students and an assistant for teachers." |
| 0:20–0:35 | Student home | **Try as Student** | "I'm Aiman, Form 2. The model has tracked six weeks of practice. My #1 priority is Factorisation at 12%, with the reasons: five of my last five answers were wrong. It's shown in BM or English; watch." Toggle **BM**, then back to **EN**. |
| 0:35–0:55 | Quiz | **Practise now** on Factorisation. Pick the *wrong* sign option, e.g. (x − 2)(x − 3) for x² + 5x + 6, then **Check answer** | "Wrong. Notice it doesn't just say wrong: it recognises the *type* of mistake, a sign error, because every wrong option is tagged with the misconception it reveals." |
| 0:55–1:25 | Tutor | **Ask CikguAI why** | "The tutor gets the question, my answer and the misconception. It's Socratic: it won't give me the answer, it asks me a question to find the step myself." Type a short reply (e.g. "they multiply to 6 but add to −5?") and let it respond. *(Optional: tap the photo button and upload a photo of handwritten working.)* |
| 1:25–1:50 | Quiz | Back → **Practise** Factorisation again; answer 2–3 correctly | "Now the adaptive engine targets this skill at about 70% predicted success. Watch mastery: 12% → 39% → 73%. That's Bayesian Knowledge Tracing updating after every answer, so it's not the AI guessing." |
| 1:50–2:20 | Teacher overview | **Switch to teacher view** (demo banner) | "Same class, teacher's view. The heatmap is every student × every topic. Aiman's factorisation cell has moved. Under Common misconceptions: 8 students repeatedly make sign errors when factorising, the same pattern Aiman showed. Three students are flagged as inactive. Optional: **Generate summary** for the AI weekly summary, built from anonymised data." |
| 2:20–2:45 | Planner | Click **Plan lesson** on the sign-error misconception → 60 min, Bahasa Melayu → **Generate lesson plan** | "One click: a KSSM-aligned lesson plan that targets *this class's* misconception, with support for the 8 students and extension for the rest. While it writes…" |
| 2:45–3:00 | Assess (while plan generates) or Plan view | **Assess → Factorising quadratics → Grade with AI** on one answer; then back to the finished plan → **DOCX** | "…marking: Claude drafts a rubric grade with evidence and a confidence score, but nothing reaches a student until I approve it. Teachers stay in charge. CikguAI: every student at their own pace, and every teacher sees who needs help." |

## Backup plans
- **AI slow or down:** the quiz, mastery, heatmap, misconceptions, groups and worksheet-from-bank all work without AI. Say: "the AI is a layer on top; the learning model runs on its own", and show the methodology page.
- **Lesson plan slow (30–60 s):** do the grading step while it generates, or open **Planner → Your plans** if you generated one during setup.
- **Wrong answer at the quiz is a different question:** any wrong option on a factorisation question works; the misconception label varies (sign error, sum/product, difference of squares).
- **Network:** have the screenshots in `docs/` or the pitch PDF ready.

## Likely judge questions
- *Is the mastery score from the AI?* No. It's Bayesian Knowledge Tracing (parameters on /methodology). Claude never sets mastery.
- *What stops the tutor from just giving answers?* The system prompt enforces Socratic guidance and refuses to do graded work; answers to quiz questions are revealed only by the quiz itself.
- *Can AI grades be trusted?* They're drafts: rubric-only, scores clamped in code, confidence and flags shown, and the teacher approves or overrides every one. Overrides are recorded.
- *Privacy?* Class summaries send pseudonymised students (S01…), photos have GPS stripped and are private to the student and their teacher, and teachers see tutor topics, not chats.
- *Is the class real?* Synthetic: 25 students simulated through the real engine for six weeks, so the dashboards behave realistically. Stated on the methodology page.
