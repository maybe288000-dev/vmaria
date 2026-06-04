import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listVideos } from "@/lib/video.functions";
import { AppNav } from "@/components/AppNav";
import { TrailersHero } from "@/components/TrailersHero";
import { ClipsMarquee } from "@/components/ClipsMarquee";
import { ContinueWatching } from "@/components/ContinueWatching";
import { Play, Film } from "lucide-react";
import { getAnonId, hasOnboarded } from "@/lib/anon-id";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [anonId, setAnonId] = useState<string>("");

  useEffect(() => {
    if (!hasOnboarded()) {
      navigate({ to: "/onboarding" });
      return;
    }
    setAnonId(getAnonId());
  }, [navigate]);

  const videos = useQuery({
    queryKey: ["videos", anonId],
    queryFn: () => listVideos({ data: { anon_id: anonId || null } }),
    enabled: !!anonId,
  });

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-4 py-6">
        <TrailersHero />

        {anonId && <ContinueWatching anonId={anonId} />}

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">لقطات مميزة</h2>
          <ClipsMarquee />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">مقترح لك</h2>
          {videos.isLoading ? (
            <p className="text-muted-foreground">جارٍ التحميل...</p>
          ) : (videos.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">لا توجد فيديوهات بعد</p>
              <Link to="/admin" className="text-primary underline">
                اذهب إلى الإدارة لمزامنة مجلد Google Drive
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(videos.data ?? []).map((v: any) => (
                <Link
                  key={v.id}
                  to="/videos/$id"
                  params={{ id: v.id }}
                  className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all"
                >
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Film className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold line-clamp-2 text-sm">{v.title}</h3>
                    {v.duration_sec && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor(v.duration_sec / 60)} دقيقة
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
