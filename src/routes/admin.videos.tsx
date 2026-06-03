import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listVideos, generateClipsAI, deleteVideo } from "@/lib/video.functions";
import { toast } from "sonner";
import { Sparkles, Trash2, Film } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/videos")({
  component: AdminVideos,
});

function AdminVideos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["videos"], queryFn: () => listVideos() });
  const [busy, setBusy] = useState<string | null>(null);

  const generate = async (id: string) => {
    setBusy(id);
    try {
      const r = await generateClipsAI({ data: { video_id: id } });
      toast.success(`تم توليد ${r.count} لقطة`);
      qc.invalidateQueries({ queryKey: ["video", id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الفيديو وكل تفاعلاته؟")) return;
    await deleteVideo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["videos"] });
    toast.success("تم الحذف");
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">الفيديوهات ({q.data?.length ?? 0})</h2>
      {q.isLoading ? (
        <p className="text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((v: any) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-muted">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Film className="h-6 w-6 m-auto text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to="/videos/$id"
                  params={{ id: v.id }}
                  className="font-medium line-clamp-1 hover:text-primary"
                >
                  {v.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {v.duration_sec ? `${Math.floor(v.duration_sec / 60)} د` : "—"}
                </p>
              </div>
              <button
                onClick={() => generate(v.id)}
                disabled={busy === v.id}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busy === v.id ? "..." : "توليد لقطات AI"}
              </button>
              <button
                onClick={() => remove(v.id)}
                className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10"
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
