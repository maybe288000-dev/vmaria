import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listPublicVideos } from "@/lib/video.functions";
import { AppNav } from "@/components/AppNav";
import { TrailersHero } from "@/components/TrailersHero";
import { ClipsMarquee } from "@/components/ClipsMarquee";
import { ContinueWatching } from "@/components/ContinueWatching";
import { Play, Film, Lock } from "lucide-react";
import { getAnonId } from "@/lib/anon-id";
import { isAuthed } from "@/lib/auth-gate";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [anonId, setAnonId] = useState<string>("");
  const [authed, setAuthedState] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAnonId(getAnonId());
    setAuthedState(isAuthed());
  }, []);

  const videos = useQuery({
    queryKey: ["public-videos"],
    queryFn: () => listPublicVideos(),
    staleTime: 5 * 60_000,
  });

  const filtered = (videos.data ?? []).filter((v: any) =>
    search.trim() === "" ? true : v.title?.toLowerCase().includes(search.toLowerCase())
  );

  const openVideo = (id: string) => {
    if (!isAuthed()) {
      navigate({ to: "/auth", search: { redirect: `/videos/${id}` } });
      return;
    }
    navigate({ to: "/videos/$id", params: { id } });
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <TrailersHero onOpen={openVideo} />

        {anonId && authed && <ContinueWatching anonId={anonId} />}

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">لقطات مميزة</h2>
          <ClipsMarquee />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">
            كل الأفلام {videos.data ? `(${videos.data.length})` : ""}
          </h2>
          {videos.isLoading ? (
            <p className="text-muted-foreground">جارٍ التحميل...</p>
          ) : (videos.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">لا توجد فيديوهات بعد</p>
              {authed && (
                <Link to="/admin" className="text-primary underline">
                  اذهب إلى الإدارة لمزامنة Google Drive
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {(videos.data ?? []).map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => openVideo(v.id)}
                  className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all text-right"
                >
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Film className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {authed ? (
                        <Play className="h-12 w-12 text-white" />
                      ) : (
                        <Lock className="h-10 w-10 text-white" />
                      )}
                    </div>
                    {v.duration_sec ? (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        {Math.floor(v.duration_sec / 60)}د
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold line-clamp-2 text-xs sm:text-sm">{v.title}</h3>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
