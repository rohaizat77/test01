import { Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLang, useSkills } from "../lib/i18n";
import { fmt } from "../lib/api";
import type { MasteryItem, SubjectId } from "../lib/types";

const isDark = () => document.documentElement.classList.contains("dark");

export function MasteryRadar({ mastery, subject }: { mastery: MasteryItem[]; subject: SubjectId }) {
  const { name } = useSkills();
  const data = mastery
    .filter((m) => m.subject === subject)
    .map((m) => ({ skill: name(m.skill), p: Math.round(m.pKnown * 100), started: m.attempts > 0 }));
  const color = subject === "math" ? "#5560d8" : "#f2603e";
  return (
    <div className="h-64 w-full" role="img" aria-label={data.map((d) => `${d.skill} ${d.p}%`).join(", ")}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke={isDark() ? "rgba(255,255,255,0.12)" : "rgba(27,31,75,0.12)"} />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: isDark() ? "#c9cbe0" : "#3a3f6b" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="p" stroke={color} fill={color} fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
          <Tooltip formatter={(v) => [`${v}%`, "Mastery"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MasteryHistory({ history }: { history: { day: string; math: number; sci: number }[] }) {
  const { t, lang } = useLang();
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={history} margin={{ left: -18, right: 6, top: 8 }}>
          <defs>
            <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5560d8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5560d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2603e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f2603e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={isDark() ? "rgba(255,255,255,0.08)" : "rgba(27,31,75,0.08)"} />
          <XAxis dataKey="day" tickFormatter={(d: string) => fmt.date(d, lang)} tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip labelFormatter={(d) => fmt.date(String(d), lang)} formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Area type="monotone" dataKey="math" name={t("Maths", "Matematik")} stroke="#5560d8" strokeWidth={2.5} fill="url(#gm)" isAnimationActive={false} />
          <Area type="monotone" dataKey="sci" name={t("Science", "Sains")} stroke="#f2603e" strokeWidth={2.5} fill="url(#gs)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoalRing({ value, goal, size = 112 }: { value: number; goal: number; size?: number }) {
  const pct = Math.min(1, value / Math.max(1, goal));
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} / ${goal} XP`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="11" className="stroke-ink-100 dark:stroke-white/10" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="11"
        strokeLinecap="round"
        stroke={pct >= 1 ? "#2bc48a" : "#ffc53d"}
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="50%" y="47%" textAnchor="middle" className="fill-current font-display text-[22px] font-extrabold">
        {value}
      </text>
      <text x="50%" y="66%" textAnchor="middle" className="fill-current text-[11px] opacity-60">
        / {goal} XP
      </text>
    </svg>
  );
}
