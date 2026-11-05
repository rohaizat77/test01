import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorNote, LangToggle, Logo, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { useLang } from "../lib/i18n";
import { useSession } from "../lib/session";
import { DemoButtons } from "./Landing";

export default function Login() {
  const { t } = useLang();
  const { user, refresh, loading } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [className, setClassName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={user.role === "teacher" ? "/t" : "/s"} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await api("/api/auth/login", { method: "POST", json: { email, password } });
      else
        await api("/api/auth/register", {
          method: "POST",
          json: { email, password, name, role, classCode: role === "student" && classCode ? classCode : undefined, className: role === "teacher" && className ? className : undefined },
        });
      await refresh();
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-800 p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />
        <Link to="/" className="relative">
          <Logo light />
        </Link>
        <div className="relative mt-auto">
          <h1 className="text-4xl font-extrabold leading-tight">{t("See it working in one click.", "Lihat ia berfungsi dengan satu klik.")}</h1>
          <p className="mt-3 max-w-md text-white/70">
            {t(
              "Each demo gets its own private class 2 Bestari with 25 students and six weeks of practice data. Switch between the student and teacher views at any time.",
              "Setiap demo mendapat kelas 2 Bestari peribadi dengan 25 murid dan data latihan enam minggu. Tukar antara paparan murid dan guru bila-bila masa.",
            )}
          </p>
          <div className="mt-6">
            <DemoButtons />
          </div>
        </div>
      </div>
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible">
            <Logo />
          </Link>
          <LangToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-8">
          <div className="mb-8 rounded-3xl bg-ink-800 p-5 text-white lg:hidden">
            <p className="font-display text-lg font-extrabold">{t("Just exploring?", "Sekadar meninjau?")}</p>
            <p className="mb-3 text-sm text-white/70">{t("Try a ready-made demo class, no sign-up.", "Cuba kelas demo sedia ada, tanpa daftar.")}</p>
            <DemoButtons size="md" />
          </div>
          <h2 className="text-2xl font-extrabold">{mode === "login" ? t("Sign in", "Log masuk") : t("Create an account", "Cipta akaun")}</h2>
          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "register" && (
              <>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("I am a", "Saya seorang")}>
                  {(["student", "teacher"] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      role="radio"
                      aria-checked={role === r}
                      onClick={() => setRole(r)}
                      className={`rounded-2xl border-2 px-3 py-2.5 text-sm font-bold ${role === r ? "border-ink-800 bg-ink-800 text-white dark:border-sun-400 dark:bg-sun-400 dark:text-ink-900" : "border-paper-200 dark:border-white/10"}`}
                    >
                      {r === "student" ? t("Student", "Murid") : t("Teacher", "Guru")}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label" htmlFor="name">{t("Name", "Nama")}</label>
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
                </div>
                {role === "student" ? (
                  <div>
                    <label className="label" htmlFor="code">{t("Class code (from your teacher, optional)", "Kod kelas (daripada guru, pilihan)")}</label>
                    <input id="code" className="input uppercase" value={classCode} onChange={(e) => setClassCode(e.target.value)} maxLength={20} />
                  </div>
                ) : (
                  <div>
                    <label className="label" htmlFor="cname">{t("Class name", "Nama kelas")}</label>
                    <input id="cname" className="input" value={className} onChange={(e) => setClassName(e.target.value)} maxLength={40} placeholder="2 Cemerlang" />
                  </div>
                )}
              </>
            )}
            <div>
              <label className="label" htmlFor="email">{t("Email", "E-mel")}</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="pw">{t("Password", "Kata laluan")}</label>
              <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              {mode === "register" && <p className="mt-1 text-xs muted">{t("At least 8 characters.", "Sekurang-kurangnya 8 aksara.")}</p>}
            </div>
            {error && <ErrorNote message={error} />}
            <button className="btn-primary w-full !py-3" disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />} {mode === "login" ? t("Sign in", "Log masuk") : t("Create account", "Cipta akaun")}
            </button>
          </form>
          <p className="mt-4 text-center text-sm muted">
            {mode === "login" ? t("New here?", "Baru di sini?") : t("Already have an account?", "Sudah ada akaun?")}{" "}
            <button className="font-bold text-ink-500 underline dark:text-sun-400" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
              {mode === "login" ? t("Create an account", "Cipta akaun") : t("Sign in", "Log masuk")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
