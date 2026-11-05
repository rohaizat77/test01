import { Crown, Medal } from "lucide-react";
import { Avatar, ErrorNote, PageHeader, PageLoader } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { useApi, useSession } from "../../lib/session";
import type { LeaderRow } from "../../lib/types";

export default function ClassBoard() {
  const { t } = useLang();
  const { user } = useSession();
  const { data, error, reload } = useApi<LeaderRow[]>("/api/class/leaderboard");
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  const top = data.slice(0, 3);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader eyebrow={user?.className ?? ""} title={t("This week's class board", "Papan kelas minggu ini")} />
      <p className="-mt-3 text-sm muted">{t("XP earned in the last 7 days. Effort counts: every answer earns XP, right or wrong.", "XP dalam 7 hari lalu. Usaha dikira: setiap jawapan dapat XP, betul atau salah.")}</p>
      <div className="grid grid-cols-3 items-end gap-2">
        {[top[1], top[0], top[2]].map((r, i) =>
          r ? (
            <div key={r.id} className={`card flex flex-col items-center !p-3 text-center ${i === 1 ? "!pb-6 !pt-5" : ""} ${r.isYou ? "!border-sun-400" : ""}`}>
              {i === 1 ? <Crown className="h-6 w-6 text-sun-500" /> : <Medal className={`h-5 w-5 ${i === 0 ? "text-ink-300" : "text-coral-400"}`} />}
              <Avatar name={r.name} id={r.id} size={i === 1 ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm"} />
              <p className="mt-1 line-clamp-1 text-sm font-bold">{r.name.split(" ")[0]}</p>
              <p className="text-xs font-extrabold text-ink-500 dark:text-sun-400">{r.weekXp} XP</p>
            </div>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
      <ol className="card !p-2">
        {data.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.isYou ? "bg-sun-100 dark:bg-sun-400/15" : ""}`}>
            <span className="w-6 text-right font-display font-extrabold muted">{r.rank}</span>
            <Avatar name={r.name} id={r.id} size="h-8 w-8 text-xs" />
            <span className="flex-1 truncate text-sm font-semibold">
              {r.name} {r.isYou && <span className="text-xs font-bold text-ink-500 dark:text-sun-400">({t("you", "anda")})</span>}
            </span>
            <span className="text-sm font-bold">{r.weekXp} XP</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
