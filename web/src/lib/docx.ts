// Builds a .docx lesson plan in the browser (no server round-trip).
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { latexToText } from "../components/MathText";
import type { LessonPlan } from "./types";

type T = (en: string, ms: string) => string;

export async function lessonPlanDocx(plan: LessonPlan, meta: { topic: string; minutes: number; className: string }, t: T): Promise<Blob> {
  const txt = (s: string) => latexToText(s);
  const h = (s: string) => new Paragraph({ text: s, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const bullets = (items: string[]) => items.map((i) => new Paragraph({ text: txt(i), bullet: { level: 0 } }));
  const cell = (s: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: txt(s), bold })] })] });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        children: [
          new Paragraph({ text: txt(plan.title), heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT }),
          new Paragraph({ children: [new TextRun({ text: `${meta.topic} · ${meta.minutes} min · ${meta.className}`, italics: true })] }),
          h(t("Learning objectives", "Objektif pembelajaran")),
          ...bullets(plan.learning_objectives),
          h(t("Success criteria", "Kriteria kejayaan")),
          ...bullets(plan.success_criteria),
          h(t("Materials", "Bahan")),
          ...bullets(plan.materials),
          h(t("Lesson flow", "Aliran pelajaran")),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [cell(t("Phase", "Fasa"), true), cell(t("Min", "Min"), true), cell(t("Teacher", "Guru"), true), cell(t("Students", "Murid"), true)] }),
              ...plan.phases.map((p) => new TableRow({ children: [cell(p.name, true), cell(String(p.minutes)), cell(p.teacher), cell(p.students)] })),
            ],
          }),
          h(t("Differentiation: support", "Pembezaan: sokongan")),
          ...bullets(plan.differentiation.support),
          h(t("Differentiation: extension", "Pembezaan: pengayaan")),
          ...bullets(plan.differentiation.extension),
          h(t("Misconceptions to watch", "Salah faham untuk diperhatikan")),
          ...plan.misconceptions.map((m) => new Paragraph({ children: [new TextRun({ text: `${txt(m.misconception)}: `, bold: true }), new TextRun(txt(m.how_to_address))], bullet: { level: 0 } })),
          h(t("Assessment", "Pentaksiran")),
          ...bullets(plan.assessment),
          h(t("Exit ticket", "Tiket keluar")),
          ...plan.exit_ticket.map((q, i) => new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${txt(q.question)} `, bold: true }), new TextRun({ text: `(${txt(q.answer)})`, italics: true })] })),
          h(t("Homework", "Kerja rumah")),
          new Paragraph(txt(plan.homework)),
          new Paragraph({ children: [new TextRun({ text: t("Generated with CikguAI and reviewed by the teacher.", "Dijana dengan CikguAI dan disemak oleh guru."), italics: true, size: 18 })], spacing: { before: 400 } }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
