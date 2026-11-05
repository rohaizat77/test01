export type Lang = "en" | "ms";
export type Bi = { en: string; ms: string };
export type SubjectId = "math" | "sci";
export type Level = "new" | "learning" | "developing" | "mastered";

export interface User {
  id: number;
  email: string | null;
  name: string;
  role: "student" | "teacher";
  classId: number | null;
  className: string | null;
  isDemo: boolean;
  lang: Lang;
  dailyGoal: number;
  joinCode: string | null;
}
export interface Me {
  user: User | null;
  aiEnabled: boolean;
}

export interface Skill {
  id: string;
  subject: SubjectId;
  form: number;
  chapter: string;
  name: Bi;
  blurb: Bi;
  prereqs: string[];
  questions: number;
}
export interface Curriculum {
  subjects: Record<SubjectId, Bi>;
  skills: Skill[];
  misconceptions: Record<string, { skill: string; label: Bi }>;
  model: { pInit: number; pLearn: number; pSlip: number; pGuessMcq: number; pGuessNum: number; masteredAt: number; minAttemptsForMastery: number; targetSuccess: number };
}

export interface MasteryItem {
  skill: string;
  subject: SubjectId;
  pKnown: number;
  level: Level;
  attempts: number;
  accuracy: number | null;
  lastPractised: string | null;
}
export interface PathStep {
  skill: string;
  priority: number;
  reasons: { code: string; value?: number; skill?: string }[];
}
export interface XpSummary {
  total: number;
  today: number;
  week: number;
  streak: number;
  last14: { day: string; xp: number }[];
}
export interface Badge {
  id: string;
  earned: boolean;
}
export interface StudentHome {
  name: string;
  className: string | null;
  dailyGoal: number;
  xp: XpSummary;
  path: PathStep[];
  mastery: MasteryItem[];
  badges: Badge[];
  rank: number | null;
  classSize: number;
  pendingAssignments: number;
}
export interface QuizQuestion {
  id: number;
  skill: string;
  kind: "mcq" | "num";
  stem: string;
  choices: string[] | null;
  source: "seed" | "ai";
  difficulty: number;
}
export interface AnswerResult {
  correct: boolean;
  correctAnswer: string;
  correctIndex: number | null;
  explanation: string;
  misconception: string | null;
  pBefore: number;
  pAfter: number;
  xp: number;
  mastered: boolean;
}
export interface Progress {
  mastery: MasteryItem[];
  history: { day: string; math: number; sci: number }[];
  quizzes: { date: string; n: number; correct: number; skills: string[] }[];
  xp: XpSummary;
  badges: Badge[];
}
export interface LeaderRow {
  rank: number;
  id: number;
  name: string;
  weekXp: number;
  totalXp: number;
  isYou: boolean;
}
export interface RubricItem {
  criterion: string;
  max: number;
  descriptor: string;
}
export interface StudentAssignment {
  id: number;
  title: string;
  skill: string | null;
  prompt: string;
  rubric: RubricItem[];
  maxScore: number;
  dueDate: string | null;
  overdue: boolean;
  submission: null | {
    status: "submitted" | "returned";
    answerText: string | null;
    image: string | null;
    submittedAt: string;
    result: null | { score: number; criteria: { criterion: string; max: number; score: number; feedback: string }[]; feedback: string };
  };
}
export interface TutorMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  image?: string | null;
  pending?: boolean;
}

// Teacher
export interface StudentRow {
  id: number;
  name: string;
  mastery: Record<string, number | null>;
  avgMastery: number;
  lastActive: string | null;
  daysInactive: number | null;
  weekXp: number;
  attempts14: number;
  accuracy14: number | null;
  change14: number;
  risk: { level: "high" | "watch" | "ok"; reasons: string[] };
}
export interface Overview {
  className: string;
  joinCode: string | null;
  students: StudentRow[];
  skills: { skill: string; subject: SubjectId; avg: number | null; started: number; mastered: number; struggling: { id: number; name: string; p: number }[] }[];
  misconceptions: { id: string; skill: string; label: Bi; count: number; students: { id: number; name: string }[] }[];
  activity: { day: string; attempts: number; active: number }[];
  totals: { students: number; activeThisWeek: number; atRisk: number; watch: number; avgMastery: number; attempts14: number };
}
export interface ClassSummary {
  headline: string;
  wins: string[];
  concerns: { title: string; detail: string; students: { id: number; name: string }[] }[];
  interventions: { title: string; activity: string; minutes: number; skill: string | null; students: { id: number; name: string }[] }[];
  shoutouts: { id: number; name: string }[];
}
export interface AssignmentListItem {
  id: number;
  title: string;
  skill: string | null;
  prompt: string;
  maxScore: number;
  dueDate: string | null;
  createdAt: string;
  classSize: number;
  counts: { submitted: number; aiGraded: number; approved: number };
  avgFinal: number | null;
}
export interface AiGrade {
  readable: boolean;
  transcription: string;
  criteria: { criterion: string; score: number; evidence: string; feedback: string }[];
  overall_feedback: string;
  teacher_note: string;
  confidence: number;
  flags: string[];
  total: number;
  max: number;
}
export interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  answerText: string | null;
  image: string | null;
  status: "submitted" | "ai_graded" | "approved";
  ai: AiGrade | null;
  aiScore: number | null;
  aiConfidence: number | null;
  finalScore: number | null;
  final: { criteria: { criterion: string; max: number; score: number; feedback: string }[]; feedback: string; overriddenFromAi: boolean | null } | null;
  teacherNote: string | null;
  submittedAt: string;
}
export interface LessonPlan {
  title: string;
  learning_objectives: string[];
  success_criteria: string[];
  materials: string[];
  phases: { name: string; minutes: number; teacher: string; students: string }[];
  differentiation: { support: string[]; extension: string[] };
  misconceptions: { misconception: string; how_to_address: string }[];
  assessment: string[];
  homework: string;
  exit_ticket: { question: string; answer: string }[];
}
export interface GeneratedQuestion {
  skill: string;
  stem_en: string;
  stem_ms: string;
  choices: { en: string; ms: string; m?: string }[];
  answer: number;
  explanation_en: string;
  explanation_ms: string;
  difficulty: "easy" | "medium" | "hard";
}
