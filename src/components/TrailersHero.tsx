import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getTrailers } from "@/lib/video.functions";
import { drivePreviewUrl } from "@/lib/drive";
import { Play, Film, ChevronRight, ChevronLeft } from "lucide-react";

export function TrailersHero({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["trailers-all"],
    queryFn: () => getTrailers({ data: { limit: 30 } }),
    staleTime: 5 * 60_000,
  });
  const [idx, setIdx] = useState(0);
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    if (!data || data.length <= 1) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => {
      setShowIframe(false);
      setIdx((i) => (i + 1) % data.length);
    }, 8000);
    return () => clearInterval(t);
  }, [data]);

  useEffect(() => {
    setShowIframe(false);
    // Auto-trigger trailer after small delay
    const t = setTimeout(() => setShowIframe(true), 1500);
    return () => clearTimeout(t);
  }, [idx]);

  if (!data || data.length === 0) {
    return (
      <section className="mb-6 rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/15 via-accent/15 to-transparent p-6 sm:p-8">
        <h1 className="text-xl sm:text-3xl font-bold mb-2">ماريا</h1>
        <p className="text-muted-foreground text-sm">منصّتك السينمائية الذكية</p>
      </section>
    );
  }

  const v = data[idx];
  const go = (delta: number) => {
    setShowIframe(false);
    setIdx((i) => (i + delta + data.length) % data.length);
  };

  return (
    <section className="mb-6 relative overflow-hidden rounded-2xl border border-border bg-black aspect-video sm:aspect-[21/9]">
      {v.thumbnail_url && (
        <img
          src={v.thumbnail_url}
          alt={v.title}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          referrerPolicy="no-referrer"
        />
      )}

      {showIframe && (
        <iframe
          src={drivePreviewUrl(v.drive_file_id, v.start_sec)}
          allow="autoplay; encrypted-media"
          className="absolute inset-0 h-full w-full pointer-events-none"
          title={v.title}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

      {data.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="السابق"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="التالي"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 z-[5]">
        <h1 className="text-base sm:text-3xl font-bold text-white mb-1 sm:mb-2 line-clamp-2">
          {v.title}
        </h1>
        {v.description && (
          <p className="hidden sm:block text-sm text-white/80 line-clamp-2 mb-3 max-w-2xl">
            {v.description}
          </p>
        )}
        <button
          onClick={() => onOpen(v.id)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Play className="h-4 w-4" /> شاهد الآن
        </button>

        {data.length > 1 && (
          <div className="mt-3 flex gap-1 overflow-hidden">
            {data.slice(0, 12).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === idx % 12 ? "w-6 bg-primary" : "w-2 bg-white/40"
                }`}
              />
            ))}
            {data.length > 12 && (
              <span className="text-[10px] text-white/60 mr-1">+{data.length - 12}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
