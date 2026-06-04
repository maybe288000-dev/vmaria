import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getRandomClips } from "@/lib/video.functions";
import { Film } from "lucide-react";

export function ClipsMarquee() {
  const { data, isLoading } = useQuery({
    queryKey: ["random-clips"],
    queryFn: () => getRandomClips({ data: { limit: 20 } }),
    staleTime: 60_000,
  });

  if (isLoading || !data || data.length === 0) return null;
  // Duplicate the list for seamless loop
  const items = [...data, ...data];

  return (
    <div className="marquee-wrap relative overflow-hidden rounded-2xl border border-border bg-card/40 py-3">
      <div className="marquee-track flex gap-3 px-3">
        {items.map((c: any, idx: number) => (
          <Link
            key={`${c.id}-${idx}`}
            to="/videos/$id"
            params={{ id: c.video_id }}
            search={{ t: c.start_sec } as any}
            className="group shrink-0 w-56 rounded-xl overflow-hidden bg-background border border-border hover:border-primary/60 transition-colors"
          >
            <div className="relative aspect-video bg-muted">
              {c.video?.thumbnail_url ? (
                <img
                  src={c.video.thumbnail_url}
                  alt={c.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                {Math.floor(c.start_sec / 60)}:
                {String(c.start_sec % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="p-2">
              <p className="text-xs font-medium line-clamp-1">{c.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{c.video?.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
