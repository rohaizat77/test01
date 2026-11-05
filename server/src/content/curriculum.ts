// KSSM Form 2 (Tingkatan 2) skills used by CikguAI.
// Chapter numbers and titles follow the KSSM Form 2 textbooks (Matematik Tingkatan 2, Sains Tingkatan 2).

export type Lang = "en" | "ms";
export type Bi = { en: string; ms: string };

export const SUBJECTS = {
  math: { en: "Mathematics", ms: "Matematik" },
  sci: { en: "Science", ms: "Sains" },
} as const;
export type SubjectId = keyof typeof SUBJECTS;

export interface Skill {
  id: string;
  subject: SubjectId;
  form: number;
  chapter: string; // KSSM chapter / subtopic number
  name: Bi;
  blurb: Bi;
  prereqs: string[];
}

export const SKILLS: Skill[] = [
  {
    id: "m-seq", subject: "math", form: 2, chapter: "1",
    name: { en: "Patterns & Sequences", ms: "Pola dan Jujukan" },
    blurb: { en: "Spot the rule, find the nth term", ms: "Kenal pasti pola, cari sebutan ke-n" },
    prereqs: [],
  },
  {
    id: "m-exp", subject: "math", form: 2, chapter: "2.1",
    name: { en: "Expansion", ms: "Kembangan" },
    blurb: { en: "Expanding brackets", ms: "Mengembangkan ungkapan dalam kurungan" },
    prereqs: [],
  },
  {
    id: "m-fact", subject: "math", form: 2, chapter: "2.2–2.3",
    name: { en: "Factorisation & Algebraic Fractions", ms: "Pemfaktoran dan Pecahan Algebra" },
    blurb: { en: "Common factors, quadratic expressions, difference of squares", ms: "Faktor sepunya, ungkapan kuadratik, beza dua kuasa dua" },
    prereqs: ["m-exp"],
  },
  {
    id: "m-form", subject: "math", form: 2, chapter: "3",
    name: { en: "Algebraic Formulae", ms: "Rumus Algebra" },
    blurb: { en: "Writing formulae and changing the subject", ms: "Membentuk rumus dan menukar perkara rumus" },
    prereqs: ["m-exp"],
  },
  {
    id: "m-poly", subject: "math", form: 2, chapter: "4",
    name: { en: "Polygons", ms: "Poligon" },
    blurb: { en: "Interior and exterior angles", ms: "Sudut pedalaman dan sudut peluaran" },
    prereqs: [],
  },
  {
    id: "m-circ", subject: "math", form: 2, chapter: "5",
    name: { en: "Circles", ms: "Bulatan" },
    blurb: { en: "Parts of a circle, circumference, area, arcs and sectors", ms: "Bahagian bulatan, lilitan, luas, lengkok dan sektor" },
    prereqs: [],
  },
  {
    id: "m-coord", subject: "math", form: 2, chapter: "7",
    name: { en: "Coordinates", ms: "Koordinat" },
    blurb: { en: "Distance and midpoint on the Cartesian plane", ms: "Jarak dan titik tengah dalam sistem koordinat Cartes" },
    prereqs: [],
  },
  {
    id: "s-bio", subject: "sci", form: 2, chapter: "1",
    name: { en: "Biodiversity", ms: "Biodiversiti" },
    blurb: { en: "Variety and classification of organisms", ms: "Kepelbagaian dan pengelasan organisma" },
    prereqs: [],
  },
  {
    id: "s-eco", subject: "sci", form: 2, chapter: "2",
    name: { en: "Ecosystem", ms: "Ekosistem" },
    blurb: { en: "Food chains, energy flow, interactions", ms: "Rantai makanan, aliran tenaga, interaksi" },
    prereqs: ["s-bio"],
  },
  {
    id: "s-nutr", subject: "sci", form: 2, chapter: "3",
    name: { en: "Nutrition", ms: "Nutrisi" },
    blurb: { en: "Food classes, food tests, digestion", ms: "Kelas makanan, ujian makanan, pencernaan" },
    prereqs: [],
  },
  {
    id: "s-water", subject: "sci", form: 2, chapter: "5",
    name: { en: "Water & Solutions", ms: "Air dan Larutan" },
    blurb: { en: "Properties of water, solubility, purification", ms: "Sifat air, keterlarutan, pembersihan air" },
    prereqs: [],
  },
  {
    id: "s-acid", subject: "sci", form: 2, chapter: "6",
    name: { en: "Acids & Alkalis", ms: "Asid dan Alkali" },
    blurb: { en: "pH, indicators, neutralisation", ms: "pH, penunjuk, peneutralan" },
    prereqs: ["s-water"],
  },
  {
    id: "s-elec", subject: "sci", form: 2, chapter: "7",
    name: { en: "Electricity & Magnetism", ms: "Keelektrikan dan Kemagnetan" },
    blurb: { en: "Current, voltage, resistance, circuits, magnets", ms: "Arus, voltan, rintangan, litar, magnet" },
    prereqs: [],
  },
];

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
export const SKILL_IDS = SKILLS.map((s) => s.id) as [string, ...string[]];

// Misconceptions are tagged on wrong answer choices, so the class dashboard can count them from real answers.
export const MISCONCEPTIONS: Record<string, { skill: string; label: Bi }> = {
  "seq-const": { skill: "m-seq", label: { en: "Uses the first term as the constant in the nth-term rule", ms: "Guna sebutan pertama sebagai pemalar dalam rumus sebutan ke-n" } },
  "seq-step": { skill: "m-seq", label: { en: "Counts the number of steps wrongly (off by one)", ms: "Salah kira bilangan langkah (terlebih/terkurang satu)" } },
  "exp-partial": { skill: "m-exp", label: { en: "Multiplies only the first term inside the bracket", ms: "Hanya darab sebutan pertama dalam kurungan" } },
  "exp-sign": { skill: "m-exp", label: { en: "Sign errors when multiplying negatives", ms: "Kesilapan tanda apabila mendarab nombor negatif" } },
  "exp-middle": { skill: "m-exp", label: { en: "Forgets the middle term when expanding two brackets", ms: "Terlupa sebutan tengah apabila mengembangkan dua kurungan" } },
  "exp-square": { skill: "m-exp", label: { en: "Thinks (a + b)² = a² + b²", ms: "Anggap (a + b)² = a² + b²" } },
  "fact-sign": { skill: "m-fact", label: { en: "Sign errors when factorising quadratics", ms: "Kesilapan tanda semasa memfaktorkan ungkapan kuadratik" } },
  "fact-sum-product": { skill: "m-fact", label: { en: "Picks factors that multiply correctly but don't add to the middle term", ms: "Pilih faktor yang betul hasil darabnya tetapi bukan hasil tambahnya" } },
  "fact-dos": { skill: "m-fact", label: { en: "Confuses difference of two squares with a perfect square", ms: "Keliru beza dua kuasa dua dengan kuasa dua sempurna" } },
  "fact-incomplete": { skill: "m-fact", label: { en: "Stops before factorising completely", ms: "Berhenti sebelum memfaktorkan selengkapnya" } },
  "fact-cancel": { skill: "m-fact", label: { en: "Cancels terms instead of common factors in fractions", ms: "Memansuhkan sebutan, bukan faktor sepunya, dalam pecahan" } },
  "form-inverse": { skill: "m-form", label: { en: "Uses the wrong inverse operation when changing the subject", ms: "Guna operasi songsang yang salah semasa menukar perkara rumus" } },
  "form-order": { skill: "m-form", label: { en: "Undoes operations in the wrong order", ms: "Menyongsangkan operasi dalam susunan yang salah" } },
  "poly-int-ext": { skill: "m-poly", label: { en: "Mixes up interior and exterior angles", ms: "Keliru sudut pedalaman dengan sudut peluaran" } },
  "poly-sum": { skill: "m-poly", label: { en: "Uses n × 180° for the interior angle sum", ms: "Guna n × 180° untuk hasil tambah sudut pedalaman" } },
  "circ-rd": { skill: "m-circ", label: { en: "Mixes up radius and diameter", ms: "Keliru jejari dengan diameter" } },
  "circ-formula": { skill: "m-circ", label: { en: "Confuses circumference and area formulas", ms: "Keliru rumus lilitan dengan rumus luas" } },
  "coord-add": { skill: "m-coord", label: { en: "Adds coordinates instead of finding differences", ms: "Tambah koordinat dan bukan cari bezanya" } },
  "coord-sqrt": { skill: "m-coord", label: { en: "Forgets to square or square-root in the distance formula", ms: "Lupa kuasa dua atau punca kuasa dua dalam rumus jarak" } },
  "bio-habitat": { skill: "s-bio", label: { en: "Classifies animals by where they live, not by their features", ms: "Mengelaskan haiwan mengikut habitat, bukan ciri" } },
  "bio-monodi": { skill: "s-bio", label: { en: "Mixes up monocot and dicot features", ms: "Keliru ciri monokotiledon dengan dikotiledon" } },
  "eco-energy": { skill: "s-eco", label: { en: "Thinks energy is recycled in an ecosystem", ms: "Anggap tenaga dikitar semula dalam ekosistem" } },
  "eco-symbiosis": { skill: "s-eco", label: { en: "Mixes up mutualism, commensalism and parasitism", ms: "Keliru mutualisme, komensalisme dan parasitisme" } },
  "nutr-site": { skill: "s-nutr", label: { en: "Wrong place for digestion or absorption", ms: "Salah tempat pencernaan atau penyerapan" } },
  "nutr-test": { skill: "s-nutr", label: { en: "Mixes up food tests (iodine, Benedict's)", ms: "Keliru ujian makanan (iodin, Benedict)" } },
  "water-solute": { skill: "s-water", label: { en: "Mixes up solute and solvent", ms: "Keliru zat terlarut dengan pelarut" } },
  "acid-ph": { skill: "s-acid", label: { en: "Reads the pH scale the wrong way round", ms: "Membaca skala pH secara terbalik" } },
  "acid-indicator": { skill: "s-acid", label: { en: "Mixes up indicator colours", ms: "Keliru warna penunjuk" } },
  "elec-series-parallel": { skill: "s-elec", label: { en: "Confuses series and parallel circuits", ms: "Keliru litar bersiri dengan litar selari" } },
  "elec-ohm": { skill: "s-elec", label: { en: "Rearranges V = IR wrongly", ms: "Salah menyusun semula V = IR" } },
};
