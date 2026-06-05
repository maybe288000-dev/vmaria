import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppNav } from "@/components/AppNav";
import { chatWithMaria, getChatHistory, clearChatHistory } from "@/lib/video.functions";
import { getAnonId } from "@/lib/anon-id";
import { isAuthed } from "@/lib/auth-gate";
import { Send, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [anonId, setAnonId] = useState("");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAuthed()) {
      navigate({ to: "/auth", search: { redirect: "/chat" } });
      return;
    }
    setAnonId(getAnonId());
  }, [navigate]);

  const history = useQuery({
    queryKey: ["chat", anonId],
    queryFn: () => getChatHistory({ data: { anon_id: anonId } }),
    enabled: !!anonId,
  });

  const send = useMutation({
    mutationFn: (msg: string) =>
      chatWithMaria({ data: { anon_id: anonId, message: msg } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", anonId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: () => clearChatHistory({ data: { anon_id: anonId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", anonId] });
      toast.success("تم مسح المحادثة");
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history.data, send.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [send.isSuccess, anonId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = input.trim();
    if (!txt || send.isPending) return;
    setInput("");
    send.mutate(txt);
  };

  const msgs = history.data ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <main className="flex-1 flex flex-col container mx-auto max-w-2xl px-3 py-3 w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold">ماريا</div>
              <div className="text-xs text-muted-foreground">متصلة الآن</div>
            </div>
          </div>
          {msgs.length > 0 && (
            <button
              onClick={() => clear.mutate()}
              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> مسح
            </button>
          )}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-3 space-y-3 min-h-[50vh]"
        >
          {msgs.length === 0 && !send.isPending && (
            <div className="text-center text-sm text-muted-foreground py-12">
              <p className="mb-2">هلا بيك! آني ماريا.</p>
              <p>شكو؟ خبرني شصاير وياك أو شتريد نحجي عنه.</p>
            </div>
          )}
          {msgs.map((m: any) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {send.isPending && (
            <div className="flex justify-end">
              <div className="rounded-2xl px-3 py-2 bg-accent text-accent-foreground text-sm">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
                  <span
                    className="h-2 w-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="mt-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e as any);
              }
            }}
            placeholder="اكتب رسالة..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-input px-3 py-3 text-sm max-h-32"
          />
          <button
            type="submit"
            disabled={send.isPending || !input.trim()}
            className="rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </main>
    </div>
  );
}
