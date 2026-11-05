// Bilingual UI: every string is written inline as t("English", "Bahasa Melayu").
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { useSession } from "./session";
import type { Bi, Lang } from "./types";

const KEY = "cikguai-lang";

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "ms" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, ms: string) => string;
  bi: (b: Bi | undefined | null) => string;
}
const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const { user, refresh } = useSession();
  const [lang, setLangState] = useState<Lang>(() => stored() ?? (navigator.language?.toLowerCase().startsWith("ms") ? "ms" : "en"));

  // A signed-in user's saved preference wins on load.
  useEffect(() => {
    if (user?.lang && !stored()) setLangState(user.lang);
  }, [user?.lang]);

  useEffect(() => {
    document.documentElement.lang = lang === "ms" ? "ms" : "en";
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(KEY, l);
      } catch {
        /* storage unavailable */
      }
      if (user) void api("/api/me", { method: "PATCH", json: { lang: l } }).then(refresh, () => undefined);
    },
    [user, refresh],
  );

  const t = useCallback((en: string, ms: string) => (lang === "ms" ? ms : en), [lang]);
  const bi = useCallback((b: Bi | undefined | null) => (b ? b[lang] : ""), [lang]);
  return <LangContext.Provider value={{ lang, setLang, t, bi }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

// Skill helpers that need both the curriculum and the language.
export function useSkills() {
  const { curriculum } = useSession();
  const { bi } = useLang();
  const skills = curriculum?.skills ?? [];
  const byId = new Map(skills.map((s) => [s.id, s]));
  return {
    skills,
    byId,
    name: (id: string | null | undefined) => (id ? (bi(byId.get(id)?.name) || id) : ""),
    subjectOf: (id: string) => byId.get(id)?.subject,
  };
}
