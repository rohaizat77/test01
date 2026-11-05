import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { PageLoader } from "./components/ui";
import { useSession } from "./lib/session";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Methodology = lazy(() => import("./pages/Methodology"));
const StudentHome = lazy(() => import("./pages/student/Home"));
const Practice = lazy(() => import("./pages/student/Practice"));
const Quiz = lazy(() => import("./pages/student/Quiz"));
const Tutor = lazy(() => import("./pages/student/Tutor"));
const Progress = lazy(() => import("./pages/student/Progress"));
const Tasks = lazy(() => import("./pages/student/Tasks"));
const ClassBoard = lazy(() => import("./pages/student/ClassBoard"));
const TeacherHome = lazy(() => import("./pages/teacher/Overview"));
const StudentDetail = lazy(() => import("./pages/teacher/StudentDetail"));
const Assess = lazy(() => import("./pages/teacher/Assess"));
const AssignmentReview = lazy(() => import("./pages/teacher/AssignmentReview"));
const Planner = lazy(() => import("./pages/teacher/Planner"));
const PlanView = lazy(() => import("./pages/teacher/PlanView"));
const Worksheets = lazy(() => import("./pages/teacher/Worksheets"));

function RequireRole({ role, children }: { role: "student" | "teacher"; children: ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "teacher" ? "/t" : "/s"} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route
          path="/s"
          element={
            <RequireRole role="student">
              <AppShell role="student" />
            </RequireRole>
          }
        >
          <Route index element={<StudentHome />} />
          <Route path="practice" element={<Practice />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="tutor" element={<Tutor />} />
          <Route path="progress" element={<Progress />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="class" element={<ClassBoard />} />
        </Route>
        <Route
          path="/t"
          element={
            <RequireRole role="teacher">
              <AppShell role="teacher" />
            </RequireRole>
          }
        >
          <Route index element={<TeacherHome />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="assess" element={<Assess />} />
          <Route path="assess/:id" element={<AssignmentReview />} />
          <Route path="plan" element={<Planner />} />
          <Route path="plan/:id" element={<PlanView />} />
          <Route path="worksheets" element={<Worksheets />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
