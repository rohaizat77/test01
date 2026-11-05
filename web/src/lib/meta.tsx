import { Award, Brain, Flame, Footprints, Globe2, Lightbulb, Sparkles, Zap } from "lucide-react";
import type { PathStep } from "./types";

type T = (en: string, ms: string) => string;

export function reasonText(r: PathStep["reasons"][number], t: T, name: (id: string) => string): string {
  switch (r.code) {
    case "not_started":
      return t("New topic: not started yet", "Topik baharu: belum dimulakan");
    case "low_mastery":
      return t(`Mastery is ${r.value}%`, `Penguasaan ${r.value}%`);
    case "recent_mistakes":
      return t(`${r.value} of your last 5 answers were wrong`, `${r.value} daripada 5 jawapan terakhir salah`);
    case "review_due":
      return t(`Time to review: last practised ${r.value} days ago`, `Masa untuk ulang kaji: kali terakhir ${r.value} hari lalu`);
    case "unlocks":
      return t(`Unlocks ${name(r.skill ?? "")}`, `Membuka ${name(r.skill ?? "")}`);
    case "needs_prereq":
      return t(`Builds on ${name(r.skill ?? "")}`, `Berasaskan ${name(r.skill ?? "")}`);
    case "mastered":
      return t("Mastered: keep it fresh", "Dikuasai: kekalkan");
    default:
      return r.code;
  }
}

export const BADGE_META: Record<string, { icon: typeof Award; en: string; ms: string; hintEn: string; hintMs: string }> = {
  first_steps: { icon: Footprints, en: "First steps", ms: "Langkah pertama", hintEn: "Answer your first question", hintMs: "Jawab soalan pertama" },
  streak_3: { icon: Flame, en: "On a roll", ms: "Bersemangat", hintEn: "3-day streak", hintMs: "Rentetan 3 hari" },
  streak_7: { icon: Zap, en: "Week warrior", ms: "Pahlawan minggu", hintEn: "7-day streak", hintMs: "Rentetan 7 hari" },
  first_mastery: { icon: Award, en: "Topic master", ms: "Pakar topik", hintEn: "Master a topic", hintMs: "Kuasai satu topik" },
  gap_bridger: { icon: Sparkles, en: "Gap bridger", ms: "Perapat jurang", hintEn: "Take a topic from under 40% to mastered", hintMs: "Naikkan topik dari bawah 40% ke dikuasai" },
  perfect_five: { icon: Brain, en: "Perfect five", ms: "Lima sempurna", hintEn: "5 out of 5 in a quiz", hintMs: "5/5 dalam kuiz" },
  curious_mind: { icon: Lightbulb, en: "Curious mind", ms: "Minda ingin tahu", hintEn: "Ask the tutor 5 questions", hintMs: "Tanya tutor 5 soalan" },
  all_rounder: { icon: Globe2, en: "All-rounder", ms: "Serba boleh", hintEn: "Practise every topic", hintMs: "Berlatih semua topik" },
};

export function greeting(t: T) {
  const h = new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60_000).getHours();
  if (h < 12) return t("Good morning", "Selamat pagi");
  if (h < 15) return t("Good afternoon", "Selamat tengah hari");
  if (h < 19) return t("Good afternoon", "Selamat petang");
  return t("Good evening", "Selamat malam");
}
