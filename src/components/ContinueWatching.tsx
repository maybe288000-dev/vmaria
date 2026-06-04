import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getContinueWatching } from "@/lib/video.functions";
import { Play, Film } from "lucide-react";

export function ContinueWatching({ anonId }: { anonId: string }) {
  const { data } = useQuery({
    queryKey: ["continue-watching", anonId],
    queryFn: () => getContinueWatching({ data: { anon_id: anonId } }),
    enabled: !!anonId,
  });
  if (!data || data.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold">تابع المشاهدة</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {data.map((it: any) => (
          <Link
            key={it.video.id}
            to="/videos/$id"
            params={{ id: it.video.id }}
            search={{ t: it.last_sec } as any}
            className="group relative shrink-0 w-64 snap-start rounded-xl overflow-hidden bg-card border border-border hover:border-primary/60 transition-colors"
          >
            <div className="relative aspect-video bg-muted">
              {it.video.thumbnail_url ? (
                <img
                  src={it.video.thumbnail_url}
                  alt={it.video.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-10 w-10 text-white" />
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${it.progress}%` }}
                />
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold line-clamp-1">{it.video.title}</p>
              <p className="text-xs text-muted-foreground">
                تابع من {Math.floor(it.last_sec / 60)}:
                {String(it.last_sec % 60).padStart(2, "0")} • {it.progress}٪
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
