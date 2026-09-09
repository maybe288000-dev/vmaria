import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getRelatedVideos } from "@/lib/video.functions";
import { driveThumbnailUrl } from "@/lib/drive";
import { Film, Sparkles } from "lucide-react";

export function RelatedVideos({ videoId }: { videoId: string }) {
  const query = useQuery({
    queryKey: ["related-videos", videoId],
    queryFn: () => getRelatedVideos({ data: { video_id: videoId, limit: 8 } }),
    staleTime: 5 * 60_000,
  });
  if (!query.data?.length) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.25em] text-primary">اختيارات من نفس الجو</p>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-4 w-4 text-primary" /> أفلام مطابقة للمحتوى</h2>
        </div>
        <span className="text-xs text-muted-foreground">الوصف · اللقطات · الوسوم</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {query.data.map((video: any) => (
          <Link key={video.id} to="/videos/$id" params={{ id: video.id }} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/60">
            <div className="relative aspect-video overflow-hidden bg-muted">
              <img src={video.thumbnail_url || driveThumbnailUrl(video.drive_file_id, 640)} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = driveThumbnailUrl(video.drive_file_id, 640); }} />
              <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">{video.match_score}% تطابق</span>
            </div>
            <div className="p-3"><h3 className="line-clamp-2 text-sm font-semibold">{video.title}</h3><p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Film className="h-3 w-3" />مطابقة موضوعية</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
