import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { RelatedVideos } from "@/components/RelatedVideos";
import {
  getVideo,
  listVideoStats,
  toggleReaction,
  getMyReactions,
  addComment,
  startViewSession,
  heartbeatViewSession,
  getResumePoint,
} from "@/lib/video.functions";
import { drivePreviewUrl, driveThumbnailUrl } from "@/lib/drive";
import { getAnonId } from "@/lib/anon-id";
import { isUserAuthed } from "@/lib/auth-gate";
import {
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Star,
  Send,
  Play,
  Maximize2,
  ArrowRight,
  ChevronDown,
  Clock3,
  Tag,
  ShieldAlert,
  UserRound,
  Languages,
  Subtitles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useRouter } from "@tanstack/react-router";

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
  const navigate = useNavigate();
  const router = useRouter();
  const [anonId, setAnonId] = useState<string>("");
  const [startSec, setStartSec] = useState<number | undefined>(tParam);
  const [playing, setPlaying] = useState<boolean>(false);
  const [showControls, setShowControls] = useState(true);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [openComments, setOpenComments] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState<"off" | "ar" | "en">("off");
  const [contentLang, setContentLang] = useState<"ar" | "en">("ar");
  const sessionRef = useRef<string | null>(null);
  const secondsRef = useRef(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isUserAuthed()) {
      navigate({ to: "/login", search: { redirect: `/videos/${id}` } });
      return;
    }
    setAnonId(getAnonId());
  }, [navigate, id]);

  useEffect(() => {
    setStartSec(tParam);
    setPlaying(false);
  }, [id, tParam]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("maria-current-movie", { detail: id }));
    return () => {
      window.dispatchEvent(new CustomEvent("maria-current-movie", { detail: undefined }));
    };
  }, [id]);

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

  // Auto-resume: if no ?t= in URL, fetch last watched position and offer to resume
  useEffect(() => {
    if (resumeChecked || !anonId || tParam !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getResumePoint({ data: { anon_id: anonId, video_id: id } });
        if (cancelled) return;
        const dur = q.data?.video?.duration_sec ?? 0;
        const notComplete = !r.completed && (dur === 0 || r.seconds < dur * 0.9);
        if (r.seconds > 30 && notComplete) {
          setStartSec(r.seconds);
          toast.success(`تم استئناف المشاهدة من ${fmt(r.seconds)}`, {
            action: {
              label: "ابدأ من البداية",
              onClick: () => setStartSec(0),
            },
            duration: 6000,
          });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setResumeChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anonId, id, tParam, q.data?.video?.duration_sec, resumeChecked]);

  // Smart back: browser back if possible, else /
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  const goFullscreen = () => {
    const container: any = playerRef.current;
    if (!container) return;
    const fn =
      container.requestFullscreen ||
      container.webkitRequestFullscreen ||
      container.webkitEnterFullscreen;
    if (fn) {
      try {
        fn.call(container);
      } catch {
        /* ignore */
      }
    }
  };

  // Auto-hide controls after 3s of inactivity
  const bumpControls = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    if (!playing) return;
    bumpControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

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
  const subtitleCues = subtitleLang === "ar" ? (Array.isArray(v.subtitle_ar) ? v.subtitle_ar : []) : subtitleLang === "en" ? (Array.isArray(v.subtitle_en) ? v.subtitle_en : []) : [];
  const story = contentLang === "en" ? (v.story_en || v.story_ar || v.description) : (v.story_ar || v.description);
  const details = contentLang === "en" ? (v.details_en || v.details_ar || "Details are not available yet.") : (v.details_ar || "تفاصيل الفيلم واللقطات الموثقة تظهر هنا بعد المعالجة.");

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={goBack}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </button>

          <div
            ref={playerRef}
            onMouseMove={bumpControls}
            onTouchStart={bumpControls}
            onClick={bumpControls}
            className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-border lg:max-h-[80vh] no-select group"
          >
            {playing ? (
              <>
                <iframe
                  key={startSec ?? "0"}
                  src={drivePreviewUrl(v.drive_file_id, startSec, { mute: true })}
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  title={`مشغل Google Drive — ${v.title}`}
                  className="absolute left-0 w-full border-0"
                  style={{ top: "-56px", height: "calc(100% + 112px)" }}
                />
                {/* Block Google Drive's bottom control bar */}
                <div
                  className="absolute left-0 right-0 bottom-0 h-14 z-[5]"
                  style={{ pointerEvents: "auto" }}
                  aria-hidden="true"
                />
                {/* Overlay controls (auto-hide) */}
                <div
                  className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Top bar */}
                  <div className="pointer-events-auto absolute top-0 inset-x-0 flex items-center justify-between gap-2 p-2 sm:p-3 bg-gradient-to-b from-black/70 to-transparent">
                    <button
                      onClick={goBack}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur"
                      aria-label="رجوع"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <span className="flex-1 text-center text-xs sm:text-sm text-white/90 line-clamp-1 px-2">
                      {v.title}
                    </span>
                    <button
                      onClick={goFullscreen}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur"
                      aria-label="ملء الشاشة"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
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
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.src = driveThumbnailUrl(v.drive_file_id, 1280); }}
                  />
                ) : null}
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 mr-0.5" />
                  </span>
                </span>
                <span className="absolute bottom-3 inset-x-3 text-right text-white font-bold text-sm sm:text-lg drop-shadow">
                  {v.title}
                </span>
              </button>
            )}
          </div>

          <section className="mt-3 rounded-2xl border border-border bg-card/70 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Subtitles className="h-4 w-4 text-primary" />الترجمة أثناء المشاهدة</div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="اختيار لغة الترجمة">
                {([['off', 'إيقاف'], ['ar', 'العربية'], ['en', 'English']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setSubtitleLang(value)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${subtitleLang === value ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{label}</button>
                ))}
              </div>
            </div>
            {subtitleLang !== "off" && subtitleCues.length > 0 ? (
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-black/20 p-2">
                {subtitleCues.map((cue: any, index: number) => (
                  <button key={`${cue.start}-${index}`} type="button" onClick={() => { setStartSec(Number(cue.start) || 0); setPlaying(true); }} className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-right text-xs hover:bg-accent/60">
                    <span className="shrink-0 text-primary">{fmt(Number(cue.start) || 0)}</span><span>{cue.text}</span>
                  </button>
                ))}
              </div>
            ) : subtitleLang !== "off" ? (
              <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />لا توجد مسارات ترجمة موثقة لهذا الفيلم بعد. مشغل Google Drive لا يسمح للموقع بقراءة الصوت من داخل الإطار تلقائيًا؛ أضف ملف VTT أو نصًا موثوقًا من لوحة الإدارة حتى تظهر الترجمة.</p>
            ) : <p className="mt-2 text-xs text-muted-foreground">اختار العربية أو English لعرض مسار الترجمة المتوفر، أو خلّيه إيقاف.</p>}
          </section>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold sm:text-2xl">{v.title}</h1>
            {v.content_rating && <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">للبالغين · {v.content_rating}</span>}
          </div>
          {story && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {story}
            </p>
          )}
          <section className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/60 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />المدة</div><p className="mt-2 text-lg font-bold">{v.duration_sec ? fmt(v.duration_sec) : "غير محددة"}</p></div>
            <div className="rounded-2xl border border-border bg-card/60 p-4 sm:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Languages className="h-4 w-4" />القصة والتفاصيل</div><div className="flex gap-1"><button type="button" onClick={() => setContentLang("ar")} className={`rounded-full px-2.5 py-1 text-[11px] ${contentLang === "ar" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>العربية</button><button type="button" onClick={() => setContentLang("en")} className={`rounded-full px-2.5 py-1 text-[11px] ${contentLang === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>English</button></div></div><p className="mt-2 text-sm leading-6">{details}</p></div>
          </section>

          {(v.content_rating || v.content_warnings?.length || (Array.isArray(v.cast_members) && v.cast_members.length > 0)) && (
            <section className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {v.content_rating && <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">{v.content_rating}</span>}
                {(v.content_warnings ?? []).map((warning: string) => <span key={warning} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300"><ShieldAlert className="h-3 w-3" />{warning}</span>)}
              </div>
              {Array.isArray(v.cast_members) && v.cast_members.length > 0 && <div className="mt-3 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />الممثلون:</span>{v.cast_members.map((person: any) => <span key={`${person.name}-${person.role ?? ""}`} className="rounded-full border border-border px-2.5 py-1 text-xs">{person.name}{person.role ? ` — ${person.role}` : ""}</span>)}</div>}
            </section>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <ReactBtn
              active={myKinds.has("like")}
              onClick={() => react("like")}
              icon={<ThumbsUp className="h-4 w-4" />}
              label={`${stats.data?.likes ?? 0}`}
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
              {stats.data?.views ?? 0} مشاهدة
            </div>
          </div>

          <ClipsSection clips={q.data.clips} videoId={id} />
          <RelatedVideos videoId={id} />

          {/* Collapsible comments */}
          <section className="mt-6 rounded-xl border border-border bg-card/60">
            <button
              onClick={() => setOpenComments((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/40 rounded-xl transition-colors"
            >
              <span>التعليقات والتقييمات ({q.data.comments.length})</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${openComments ? "rotate-180" : ""}`}
              />
            </button>
            {openComments && (
              <div className="border-t border-border p-3 sm:p-4">
                <CommentsBlock videoId={id} anonId={anonId} initial={q.data.comments} />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ClipsSection({ clips, videoId }: { clips: any[]; videoId: string }) {
  const navigate = useNavigate();
  if (!clips?.length) return null;
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">لقطات الفيلم</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            مقاطع مرتبة مع شرح عربي مختصر — اضغط للانتقال مباشرة
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          {clips.length} لقطات
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {clips.map((clip: any, index: number) => (
          <button
            key={clip.id}
            onClick={() =>
              navigate({
                to: "/videos/$id",
                params: { id: videoId },
                search: { t: clip.start_sec } as any,
              })
            }
            className="group rounded-xl border border-border bg-background/70 p-3 text-right transition-all hover:border-primary/60 hover:bg-accent/40"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 text-sm font-semibold group-hover:text-primary">
                    {clip.title || `لقطة ${index + 1}`}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    {fmt(clip.start_sec || 0)}
                  </span>
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {clip.description || "لقطة مختارة من الفيلم."}
                </span>
                {Array.isArray(clip.tags) && clip.tags.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1">
                    {clip.tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
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
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
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
    <>
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
    </>
  );
}
