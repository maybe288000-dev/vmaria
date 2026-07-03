import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listVideos,
  generateClipsAI,
  generateVideoDescription,
  deleteVideo,
} from "@/lib/video.functions";
import { toast } from "sonner";
import { Sparkles, Trash2, Film, Wand2, Square, FileText } from "lucide-react";
import { useRef, useState } from "react";

export const Route = createFileRoute("/admin/videos")({
  component: AdminVideos,
});

function AdminVideos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["videos"], queryFn: () => listVideos({ data: {} }) });
  const [busy, setBusy] = useState<string | null>(null);
  const [busyDesc, setBusyDesc] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{
    kind: "clips" | "desc";
    done: number;
    total: number;
    current?: string;
  } | null>(null);
  const cancelRef = useRef(false);

  const generate = async (id: string) => {
    setBusy(id);
    try {
      const r = await generateClipsAI({ data: { video_id: id } });
      toast.success(`تم توليد ${r.count} لقطة`);
      qc.invalidateQueries({ queryKey: ["video", id] });
      qc.invalidateQueries({ queryKey: ["random-clips"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const genDesc = async (id: string) => {
    setBusyDesc(id);
    try {
      await generateVideoDescription({ data: { video_id: id } });
      toast.success("تم توليد الوصف");
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["video", id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyDesc(null);
    }
  };

  const generateAll = async () => {
    const videos = q.data ?? [];
    if (videos.length === 0) return;
    if (!confirm(`توليد لقطات لـ ${videos.length} فيديو؟ قد يستغرق وقتاً.`)) return;
    cancelRef.current = false;
    setBulk({ kind: "clips", done: 0, total: videos.length });
    let ok = 0,
      fail = 0;
    for (let i = 0; i < videos.length; i++) {
      if (cancelRef.current) break;
      const v = videos[i];
      setBulk({ kind: "clips", done: i, total: videos.length, current: v.title });
      try {
        await generateClipsAI({ data: { video_id: v.id } });
        ok++;
      } catch {
        fail++;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setBulk(null);
    qc.invalidateQueries({ queryKey: ["videos"] });
    qc.invalidateQueries({ queryKey: ["random-clips"] });
    toast.success(`اكتمل: ${ok} نجح، ${fail} فشل`);
  };

  const generateAllDesc = async () => {
    const videos = (q.data ?? []).filter((v: any) => !v.description);
    if (videos.length === 0) {
      toast.info("كل الأفلام لديها وصف بالفعل");
      return;
    }
    if (!confirm(`توليد وصف لـ ${videos.length} فيلم بدون وصف؟`)) return;
    cancelRef.current = false;
    setBulk({ kind: "desc", done: 0, total: videos.length });
    let ok = 0,
      fail = 0;
    for (let i = 0; i < videos.length; i++) {
      if (cancelRef.current) break;
      const v = videos[i];
      setBulk({ kind: "desc", done: i, total: videos.length, current: v.title });
      try {
        await generateVideoDescription({ data: { video_id: v.id } });
        ok++;
      } catch {
        fail++;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    setBulk(null);
    qc.invalidateQueries({ queryKey: ["videos"] });
    toast.success(`اكتمل: ${ok} نجح، ${fail} فشل`);
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الفيديو وكل تفاعلاته؟")) return;
    await deleteVideo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["videos"] });
    toast.success("تم الحذف");
  };

  const pct = bulk ? Math.round((bulk.done / bulk.total) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold">الفيديوهات ({q.data?.length ?? 0})</h2>
        {!bulk ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generateAllDesc}
              disabled={!q.data || q.data.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              توليد وصف للكل
            </button>
            <button
              onClick={generateAll}
              disabled={!q.data || q.data.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              توليد لقطات للكل
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              cancelRef.current = true;
            }}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <Square className="h-4 w-4" /> إيقاف
          </button>
        )}
      </div>

      {bulk && (
        <div className="mb-4 rounded-lg border border-border bg-card p-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span className="line-clamp-1">
              {bulk.kind === "clips" ? "لقطات: " : "وصف: "}
              {bulk.current ?? "..."}
            </span>
            <span>
              {bulk.done}/{bulk.total} ({pct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {q.isLoading ? (
        <p className="text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((v: any) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-muted">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Film className="h-6 w-6 m-auto text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-[180px]">
                <Link
                  to="/videos/$id"
                  params={{ id: v.id }}
                  className="font-medium line-clamp-1 hover:text-primary"
                >
                  {v.title}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {v.duration_sec ? `${Math.floor(v.duration_sec / 60)} د` : "—"}
                  {v.description ? " • ✓ وصف" : " • بدون وصف"}
                </p>
              </div>
              <button
                onClick={() => genDesc(v.id)}
                disabled={busyDesc === v.id || !!bulk}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {busyDesc === v.id ? "..." : "وصف AI"}
              </button>
              <button
                onClick={() => generate(v.id)}
                disabled={busy === v.id || !!bulk}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busy === v.id ? "..." : "لقطات AI"}
              </button>
              <button
                onClick={() => remove(v.id)}
                disabled={!!bulk}
                className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
