import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { chatWithMaria, clearChatHistory, getChatHistory } from "@/lib/video.functions";
import { getAnonId } from "@/lib/anon-id";

type ReferencedMovie = { title: string; video_id: string };
type Message = { role: "user" | "assistant"; content: string; referenced_movies?: ReferencedMovie[] };

function renderMessageContent(message: Message) {
  if (message.role !== "assistant" || !message.referenced_movies?.length) {
    return message.content;
  }
  const sorted = [...message.referenced_movies].sort((a, b) => b.title.length - a.title.length);
  const escaped = sorted.map((m) => m.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = message.content.split(regex);
  const movieMap = new Map(message.referenced_movies.map((m) => [m.title, m]));
  return parts.map((part, i) => {
    const movie = movieMap.get(part);
    if (movie) {
      return (
        <Link
          key={i}
          to="/videos/$id"
          params={{ id: movie.video_id }}
          className="text-primary font-semibold hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const starters = ["رشّح لي فيلمًا الليلة", "أريد فيلمًا قصيرًا ومشوقًا", "شنو أفضل لقطة أبدأ بها؟"];

export function MariaAssistant() {
  const [open, setOpen] = useState(false);
  const [anonId, setAnonId] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState<string | undefined>();
  const [currentTime, setCurrentTime] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getAnonId();
    setAnonId(id);
    getChatHistory({ data: { anon_id: id } })
      .then((rows: any[]) => setMessages(rows.filter((m) => m.role !== "system")))
      .catch(() => undefined);
    const onMovieChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && typeof detail === "object") {
        setCurrentVideoId(detail.videoId);
        setCurrentTime(detail.currentTime);
      } else if (typeof detail === "string") {
        setCurrentVideoId(detail);
        setCurrentTime(undefined);
      } else {
        setCurrentVideoId(undefined);
        setCurrentTime(undefined);
      }
    };
    window.addEventListener("maria-current-movie", onMovieChange);
    return () => window.removeEventListener("maria-current-movie", onMovieChange);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (preset?: string) => {
    const message = (preset ?? input).trim();
    if (!message || !anonId || busy) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setBusy(true);
    try {
      const result = await chatWithMaria({ data: { anon_id: anonId, message, video_id: currentVideoId, t: currentTime } });
      setMessages((current) => [...current, { role: "assistant", content: result.reply, referenced_movies: result.referenced_movies }]);
    } catch (error: any) {
      toast.error(error?.message || "تعذّر الاتصال بالمساعد");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    await clearChatHistory({ data: { anon_id: anonId } });
    setMessages([]);
    toast.success("تم مسح المحادثة");
  };

  return (
    <>
      {open && (
        <section className="fixed bottom-20 left-3 z-50 flex w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-primary/25 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl sm:left-6" aria-label="مساعد ماريا السينمائي">
          <header className="flex items-center justify-between border-b border-border bg-gradient-to-l from-primary/20 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
              <div><p className="font-bold">مساعد ماريا</p><p className="text-[11px] text-muted-foreground">من كتالوج ماريا ولقطاته فقط</p></div>
            </div>
            <div className="flex items-center gap-1"><button onClick={clear} className="rounded-full p-2 text-muted-foreground hover:bg-accent" title="مسح المحادثة"><Trash2 className="h-4 w-4" /></button><button onClick={() => setOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-accent" title="إغلاق"><X className="h-4 w-4" /></button></div>
          </header>
          <div className="flex max-h-[min(52vh,430px)] min-h-44 flex-col gap-3 overflow-y-auto p-3">
            {messages.length === 0 && <div className="rounded-2xl bg-accent/40 p-3 text-sm leading-7 text-muted-foreground">هلا! اسأليني عن فيلم مناسب لمزاجك، أو اطلب لقطة تبدأ منها. أساعدك باختيارات واضحة ومحترمة.</div>}
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "self-start rounded-br-md bg-primary text-primary-foreground" : "self-end rounded-bl-md bg-muted text-foreground"}`}>{renderMessageContent(message)}</div>)}
            {busy && <div className="self-end rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-muted-foreground">أفكّر بالاختيار المناسب…</div>}
            <div ref={endRef} />
          </div>
          {messages.length === 0 && <div className="flex gap-2 overflow-x-auto px-3 pb-2">{starters.map((starter) => <button key={starter} onClick={() => send(starter)} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary">{starter}</button>)}</div>}
          <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t border-border p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="اكتب سؤالك…" maxLength={2000} className="min-w-0 flex-1 rounded-full border border-border bg-input px-4 py-2 text-sm outline-none focus:border-primary" aria-label="رسالتك" />
            <button type="submit" disabled={!input.trim() || busy} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40" aria-label="إرسال"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      )}
      <button onClick={() => setOpen((value) => !value)} className="fixed bottom-4 left-3 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:scale-105 sm:left-6" aria-label="فتح مساعد ماريا"><MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">اسأل ماريا</span></button>
    </>
  );
}
