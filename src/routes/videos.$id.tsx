import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  getVideo,
  listVideoStats,
  toggleReaction,
  getMyReactions,
  addComment,
  startViewSession,
  heartbeatViewSession,
} from "@/lib/video.functions";
import { drivePreviewUrl } from "@/lib/drive";
import { getAnonId } from "@/lib/anon-id";
import { ThumbsUp, ThumbsDown, Bookmark, Star, Send, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/videos/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    t: typeof s.t === "number" ? s.t : s.t ? Number(s.t) || undefined : undefined,
  }),
  component: VideoPage,
});

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoPage() {
  const { id } = Route.useParams();
  const { t: tParam } = Route.useSearch();
  const qc = useQueryClient();
  const [anonId, setAnonId] = useState<string>("");
  const [startSec, setStartSec] = useState<number | undefined>(tParam);
  const [playing, setPlaying] = useState<boolean>(false);
  const sessionRef = useRef<string | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => setAnonId(getAnonId()), []);

  const q = useQuery({
    queryKey: ["video", id],
    queryFn: () => getVideo({ data: { id } }),
  });
  const stats = useQuery({
    queryKey: ["video-stats", id],
    queryFn: () => listVideoStats({ data: { video_id: id } }),
  });
  const my = useQuery({
    queryKey: ["my-reactions", id, anonId],
    queryFn: () =>
      getMyReactions({
        data: { anon_id: anonId, target_type: "video", target_ids: [id] },
      }),
    enabled: !!anonId,
  });
  const myKinds = useMemo(() => new Set((my.data ?? []).map((r: any) => r.kind)), [my.data]);

  // Start a view session + heartbeat every 15s (paused when tab hidden)
  useEffect(() => {
    if (!anonId || !q.data?.video || !playing) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      const { session_id } = await startViewSession({
        data: { anon_id: anonId, video_id: id, device: navigator.userAgent.slice(0, 40) },
      });
      if (cancelled) return;
      sessionRef.current = session_id;
      const dur = q.data?.video?.duration_sec ?? 0;
      interval = setInterval(() => {
        if (document.hidden) return;
        secondsRef.current += 15;
        const completed = dur > 0 && secondsRef.current >= dur * 0.9;
        heartbeatViewSession({
          data: {
            session_id,
            seconds_watched: secondsRef.current + (startSec ?? 0),
            completed,
          },
        }).catch(() => {});
      }, 15000);
    })();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [anonId, q.data?.video, id, playing, startSec]);

  const react = async (kind: "like" | "dislike" | "save") => {
    if (!anonId) return;
    await toggleReaction({ data: { anon_id: anonId, target_type: "video", target_id: id, kind } });
    qc.invalidateQueries({ queryKey: ["my-reactions", id] });
    qc.invalidateQueries({ queryKey: ["video-stats", id] });
  };

  if (q.isLoading) return <div className="p-8 text-muted-foreground">جارٍ التحميل...</div>;
  if (!q.data?.video) return <div className="p-8">الفيديو غير موجود</div>;
  const v = q.data.video;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-border">
              {playing ? (
                <iframe
                  key={startSec ?? "0"}
                  src={drivePreviewUrl(v.drive_file_id, startSec)}
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="group absolute inset-0 h-full w-full"
                  aria-label="تشغيل"
                >
                  {v.thumbnail_url ? (
                    <img
                      src={v.thumbnail_url}
                      alt={v.title}
                      className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                      <Play className="h-7 w-7 mr-0.5" />
                    </span>
                  </span>
                </button>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold">{v.title}</h1>
            {v.description && (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                {v.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <ReactBtn
                active={myKinds.has("like")}
                onClick={() => react("like")}
                icon={<ThumbsUp className="h-4 w-4" />}
                label={`إعجاب ${stats.data?.likes ?? 0}`}
              />
              <ReactBtn
                active={myKinds.has("dislike")}
                onClick={() => react("dislike")}
                icon={<ThumbsDown className="h-4 w-4" />}
                label={`${stats.data?.dislikes ?? 0}`}
              />
              <ReactBtn
                active={myKinds.has("save")}
                onClick={() => react("save")}
                icon={<Bookmark className="h-4 w-4" />}
                label="حفظ"
              />
              <div className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                مشاهدات: {stats.data?.views ?? 0} • مشاهدون فريدون: {stats.data?.unique_viewers ?? 0}
              </div>
            </div>

            <CommentsBlock videoId={id} anonId={anonId} initial={q.data.comments} />
          </div>

          <aside>
            <h2 className="text-lg font-bold mb-3">اللقطات</h2>
            {q.data.clips.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد لقطات بعد. يمكن للأدمن توليدها من صفحة الإدارة.
              </p>
            ) : (
              <ul className="space-y-2">
                {q.data.clips.map((c: any) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setStartSec(c.start_sec)}
                      className="w-full text-right rounded-lg border border-border bg-card p-3 hover:border-primary/50"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-medium line-clamp-1">{c.title}</span>
                        <span className="text-xs text-primary shrink-0">{fmt(c.start_sec)}</span>
                      </div>
                      {c.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {c.description}
                        </p>
                      )}
                      {c.tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map((t: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-full bg-accent/50 px-2 py-0.5 text-[10px]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function ReactBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-accent"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function CommentsBlock({
  videoId,
  anonId,
  initial,
}: {
  videoId: string;
  anonId: string;
  initial: any[];
}) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [name, setName] = useState("");
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim() || !anonId) return;
    setBusy(true);
    try {
      const row = await addComment({
        data: {
          anon_id: anonId,
          video_id: videoId,
          body: body.trim(),
          rating: rating || null,
          display_name: name.trim() || null,
        },
      });
      setItems([row, ...items]);
      setBody("");
      setRating(0);
      toast.success("تمت إضافة التعليق");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-3">التعليقات والتقييمات</h2>
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} type="button">
              <Star
                className={`h-5 w-5 ${
                  n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
          <span className="text-xs text-muted-foreground mr-2">
            {rating ? `${rating}/5` : "اختياري"}
          </span>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسمك (اختياري)"
          className="mb-2 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب تعليقاً..."
          rows={3}
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <div className="mt-2 flex justify-end">
          <button
            disabled={busy || !body.trim()}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> إرسال
          </button>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{c.display_name || "مجهول"}</span>
              {c.rating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {c.rating}/5
                </span>
              )}
            </div>
            <p className="text-sm whitespace-pre-line">{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
