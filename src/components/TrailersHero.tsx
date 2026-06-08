import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getTrailers } from "@/lib/video.functions";
import { drivePreviewUrl, driveThumbnailUrl } from "@/lib/drive";
import { Play, ChevronRight, ChevronLeft } from "lucide-react";

export function TrailersHero({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["trailers-all"],
    queryFn: () => getTrailers({ data: { limit: 30 } }),
    staleTime: 5 * 60_000,
  });
  const [idx, setIdx] = useState(0);
  const [showIframe, setShowIframe] = useState(false);
  const [randomStart, setRandomStart] = useState<number>(0);
  const touchX = useRef<number | null>(null);

  // Auto-advance carousel every 30s
  useEffect(() => {
    if (!data || data.length <= 1) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => {
      setShowIframe(false);
      setIdx((i) => (i + 1) % data.length);
    }, 30000);
    return () => clearInterval(t);
  }, [data]);

  // Pick a random start (10%..70% of duration; fallback 30..180s) then trigger trailer
  useEffect(() => {
    setShowIframe(false);
    if (!data || data.length === 0) return;
    const cur = data[idx];
    const dur = cur?.duration_sec ?? 0;
    let start = 0;
    if (dur > 30) {
      const min = Math.floor(dur * 0.1);
      const max = Math.floor(dur * 0.7);
      start = Math.floor(min + Math.random() * Math.max(1, max - min));
    } else {
      start = 30 + Math.floor(Math.random() * 150);
    }
    setRandomStart(start);
    const t = setTimeout(() => setShowIframe(true), 600);
    return () => clearTimeout(t);
  }, [idx, data]);

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

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) go(dx > 0 ? -1 : 1); // RTL: swipe right = previous
    touchX.current = null;
  };

  const fallbackThumb = driveThumbnailUrl(v.drive_file_id, 1280);

  return (
    <section
      className="mb-6 relative overflow-hidden rounded-2xl border border-border bg-black aspect-[16/10] sm:aspect-[21/9] no-select"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={v.thumbnail_url || fallbackThumb}
        alt={v.title}
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.src !== fallbackThumb) el.src = fallbackThumb;
        }}
      />

      {showIframe && (
        <iframe
          key={`${v.id}-${randomStart}`}
          src={drivePreviewUrl(v.drive_file_id, randomStart, { autoplay: true, mute: true })}
          allow="autoplay; encrypted-media"
          className="absolute left-0 w-full pointer-events-none border-0"
          style={{ top: "-80px", height: "calc(100% + 160px)" }}
          title={v.title}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      {data.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="السابق"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="التالي"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white"
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
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg"
        >
          <Play className="h-4 w-4" /> شاهد الآن
        </button>

        {data.length > 1 && (
          <div className="mt-3 flex gap-1 overflow-hidden">
            {data.slice(0, 8).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === idx % 8 ? "w-6 bg-primary" : "w-2 bg-white/40"
                }`}
              />
            ))}
            {data.length > 8 && (
              <span className="text-[10px] text-white/60 mr-1">+{data.length - 8}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
