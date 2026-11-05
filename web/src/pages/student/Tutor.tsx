import { Camera, ImagePlus, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MathMarkdown } from "../../components/MathText";
import { AiOffNotice, ErrorNote, Spinner } from "../../components/ui";
import { api, shrinkImage, streamForm } from "../../lib/api";
import { useLang, useSkills } from "../../lib/i18n";
import { useSession } from "../../lib/session";
import type { TutorMessage } from "../../lib/types";

export default function Tutor() {
  const { t, lang } = useLang();
  const { name } = useSkills();
  const { aiEnabled } = useSession();
  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const focusSent = useRef(false);
  const skill = params.get("skill") ?? undefined;

  useEffect(() => {
    api<TutorMessage[]>("/api/tutor/history")
      .then((h) => setMessages(h))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Arriving from a wrong quiz answer: ask the tutor to diagnose it straight away.
  useEffect(() => {
    const q = params.get("q");
    const r = params.get("r");
    if (!loaded || !q || !r || focusSent.current || !aiEnabled) return;
    focusSent.current = true;
    void send({ questionId: q, response: r });
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, aiEnabled]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await shrinkImage(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send(focus?: { questionId: string; response: string }) {
    const msg = text.trim();
    if (busy || (!msg && !photo && !focus)) return;
    setError(null);
    setBusy(true);
    const form = new FormData();
    if (msg) form.append("message", msg);
    if (skill) form.append("skill", skill);
    if (focus) {
      form.append("questionId", focus.questionId);
      form.append("response", focus.response);
    }
    if (photo) form.append("image", photo.blob, "photo.jpg");
    const shown =
      msg ||
      (photo
        ? t("Can you check my working in this photo?", "Boleh tolong semak jalan kerja saya dalam gambar ini?")
        : t("I got this question wrong. Can you help me understand it?", "Saya salah jawab soalan ini. Boleh bantu saya faham?"));
    setMessages((m) => [...m, { role: "user", content: shown, image: photo?.url ?? null }, { role: "assistant", content: "", pending: true }]);
    setText("");
    setPhoto(null);
    try {
      await streamForm(`/api/tutor?lang=${lang}`, form, (chunk) =>
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setMessages((m) => m.map((x) => (x.pending ? { ...x, pending: false } : x)));
      setBusy(false);
    }
  }

  async function clear() {
    await api("/api/tutor/history", { method: "DELETE" });
    setMessages([]);
  }

  const suggestions = [
    t("How do I factorise x² − 5x + 6?", "Bagaimana nak faktorkan x² − 5x + 6?"),
    t("Why is energy lost along a food chain?", "Kenapa tenaga berkurang dalam rantai makanan?"),
    t("Explain series vs parallel circuits simply", "Terangkan litar bersiri dan selari dengan mudah"),
    t("Give me a hint for changing the subject of a formula", "Beri petunjuk untuk menukar perkara rumus"),
  ];

  return (
    <div className="mx-auto flex h-[calc(100dvh-13rem)] max-w-3xl flex-col lg:h-[calc(100dvh-7rem)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t("Your AI tutor", "Tutor AI anda")}</p>
          <h1 className="text-2xl font-extrabold">CikguAI</h1>
          {skill && <p className="text-sm muted">{t(`Topic: ${name(skill)}`, `Topik: ${name(skill)}`)}</p>}
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="chip !text-xs" disabled={busy}>
            <RotateCcw className="h-3.5 w-3.5" /> {t("New chat", "Sembang baharu")}
          </button>
        )}
      </div>

      {!aiEnabled && (
        <div className="mt-3">
          <AiOffNotice />
        </div>
      )}

      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pb-2" aria-live="polite">
        {loaded && messages.length === 0 && (
          <div className="card grid-paper !p-6 text-center">
            <p className="font-display text-xl font-extrabold">{t("Hi! I'm CikguAI.", "Hai! Saya CikguAI.")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm muted">
              {t(
                "I won't just give you answers. I'll ask questions and give hints so you can work it out yourself. Snap a photo of your working and I'll find where it went wrong.",
                "Saya tak akan beri jawapan terus. Saya akan tanya soalan dan beri petunjuk supaya anda boleh selesaikannya sendiri. Ambil gambar jalan kerja anda dan saya akan cari di mana silapnya.",
              )}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} className="chip !text-xs" onClick={() => setText(s)}>
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs muted">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("Stays on schoolwork. Your teacher sees which topics you ask about, not your chats.", "Fokus pada pelajaran. Guru nampak topik yang anda tanya, bukan perbualan anda.")}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-3xl px-4 py-3 text-[15px] ${
                m.role === "user" ? "rounded-br-lg bg-ink-800 text-white dark:bg-ink-600" : "rounded-bl-lg border border-paper-200 bg-white dark:border-white/10 dark:bg-ink-900"
              }`}
            >
              {m.image && <img src={m.image} alt={t("Your photo", "Gambar anda")} className="mb-2 max-h-56 rounded-2xl" />}
              {m.role === "assistant" ? (
                m.content ? (
                  <MathMarkdown text={m.content} />
                ) : (
                  <span className="flex items-center gap-2 muted">
                    <Spinner className="h-4 w-4" /> {t("Thinking…", "Sedang berfikir…")}
                  </span>
                )
              ) : (
                <MathMarkdown text={m.content} className="[&_blockquote]:border-white/40" />
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <ErrorNote message={error} />}

      <form
        className="mt-2 rounded-3xl border border-paper-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-ink-900"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {photo && (
          <div className="relative mb-2 inline-block">
            <img src={photo.url} alt={t("Photo to send", "Gambar untuk dihantar")} className="h-20 rounded-xl" />
            <button type="button" onClick={() => setPhoto(null)} className="absolute -right-2 -top-2 rounded-full bg-ink-800 p-1 text-white">
              <X className="h-3 w-3" />
              <span className="sr-only">{t("Remove photo", "Buang gambar")}</span>
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <button type="button" onClick={() => camRef.current?.click()} className="rounded-full p-2.5 hover:bg-ink-800/5 sm:hidden" title={t("Take photo", "Ambil gambar")}>
            <Camera className="h-5 w-5" />
            <span className="sr-only">{t("Take photo", "Ambil gambar")}</span>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full p-2.5 hover:bg-ink-800/5 dark:hover:bg-white/5" title={t("Add photo", "Tambah gambar")}>
            <ImagePlus className="h-5 w-5" />
            <span className="sr-only">{t("Add photo", "Tambah gambar")}</span>
          </button>
          <label htmlFor="tutor-input" className="sr-only">
            {t("Message", "Mesej")}
          </label>
          <textarea
            id="tutor-input"
            rows={1}
            value={text}
            maxLength={1200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={t("Ask a question or describe where you're stuck…", "Tanya soalan atau terangkan di mana anda buntu…")}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-base focus:outline-none"
          />
          <button type="submit" disabled={busy || (!text.trim() && !photo)} className="btn-sun !rounded-full !p-3" title={t("Send", "Hantar")}>
            {busy ? <Spinner className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">{t("Send", "Hantar")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
