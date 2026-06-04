import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTrailers } from "@/lib/video.functions";
import { drivePreviewUrl } from "@/lib/drive";
import { Play, Film } from "lucide-react";

export function TrailersHero() {
  const { data } = useQuery({
    queryKey: ["trailers"],
    queryFn: () => getTrailers({ data: { limit: 5 } }),
    staleTime: 5 * 60_000,
  });
  const [idx, setIdx] = useState(0);
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    if (!data || data.length <= 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % data.length), 9000);
    return () => clearInterval(t);
  }, [data]);

  // Reset iframe on slide change
  useEffect(() => {
    setShowIframe(false);
  }, [idx]);

  if (!data || data.length === 0) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/15 via-accent/15 to-transparent p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً بمكتبتك السينمائية</h1>
        <p className="text-muted-foreground">أضف أفلامك من الإدارة لتظهر تريلراتها هنا.</p>
      </section>
    );
  }

  const v = data[idx];
  return (
    <section className="mb-8 relative overflow-hidden rounded-2xl border border-border bg-black aspect-video sm:aspect-[21/9]">
      {/* Thumbnail backdrop */}
      {v.thumbnail_url ? (
        <img
          src={v.thumbnail_url}
          alt={v.title}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/30">
          <Film className="h-16 w-16 text-white/40" />
        </div>
      )}

      {/* Optional iframe trailer */}
      {showIframe && (
        <iframe
          src={drivePreviewUrl(v.drive_file_id, v.start_sec)}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <h1 className="text-xl md:text-3xl font-bold text-white mb-2 line-clamp-2">{v.title}</h1>
        {v.description && (
          <p className="hidden md:block text-sm text-white/80 line-clamp-2 mb-3 max-w-2xl">
            {v.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/videos/$id"
            params={{ id: v.id }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-4 w-4" /> شاهد الآن
          </Link>
          {!showIframe && (
            <button
              onClick={() => setShowIframe(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm text-white hover:bg-white/25"
            >
              تشغيل تريلر
            </button>
          )}
        </div>

        {data.length > 1 && (
          <div className="mt-4 flex gap-1.5">
            {data.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`عرض ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-8 bg-primary" : "w-3 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
