import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Curriculum, Lang, Me } from "./types";

interface SessionValue extends Me {
  loading: boolean;
  curriculum: Curriculum | null;
  refresh: () => Promise<void>;
  startDemo: (role: "student" | "teacher", lang: Lang) => Promise<void>;
  switchDemo: () => Promise<"student" | "teacher">;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>({ user: null, aiEnabled: false });
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/me"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api<Curriculum>("/api/curriculum").then(setCurriculum, () => undefined);
  }, [refresh]);

  const startDemo = useCallback(
    async (role: "student" | "teacher", lang: Lang) => {
      await api("/api/auth/demo", { method: "POST", json: { role, lang } });
      await refresh();
    },
    [refresh],
  );

  const switchDemo = useCallback(async () => {
    const r = await api<{ role: "student" | "teacher" }>("/api/auth/demo/switch", { method: "POST", json: {} });
    await refresh();
    return r.role;
  }, [refresh]);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", json: {} });
    await refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ ...me, loading, curriculum, refresh, startDemo, switchDemo, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

// Small data-loading hook with reload support. Pass null to skip.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, reload: load, setData };
}
