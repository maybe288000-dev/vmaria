import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { listVideos, listCategories, getUserInterests } from "@/lib/video.functions";
import { AppNav } from "@/components/AppNav";
import { Play, Film } from "lucide-react";
import { getAnonId, hasOnboarded } from "@/lib/anon-id";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [anonId, setAnonId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | "all">("all");

  useEffect(() => {
    if (!hasOnboarded()) {
      navigate({ to: "/onboarding" });
      return;
    }
    setAnonId(getAnonId());
  }, [navigate]);

  const videos = useQuery({ queryKey: ["videos"], queryFn: () => listVideos() });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const interests = useQuery({
    queryKey: ["interests", anonId],
    queryFn: () => getUserInterests({ data: { anon_id: anonId! } }),
    enabled: !!anonId,
  });

  const sortedVideos = useMemo(() => {
    const list = videos.data ?? [];
    if (activeCat !== "all") {
      // simple filter not available without join; show all for now
    }
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [videos.data, activeCat]);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-transparent p-8 border border-border">
          <h1 className="text-3xl font-bold mb-2">مرحباً بك في منصّتك للأفلام واللقطات</h1>
          <p className="text-muted-foreground">
            شاهد، تفاعل، احفظ، وعدّل اهتماماتك لاكتشاف محتوى يناسبك.
          </p>
          {interests.data && interests.data.length > 0 && (
            <p className="mt-3 text-sm text-primary">
              لديك {interests.data.length} اهتمامات مفعّلة
            </p>
          )}
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat("all")}
            className={`rounded-full px-4 py-1.5 text-sm border ${
              activeCat === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            الكل
          </button>
          {(cats.data ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm border ${
                activeCat === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {videos.isLoading ? (
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        ) : sortedVideos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">لا توجد فيديوهات بعد</p>
            <Link to="/admin" className="text-primary underline">
              اذهب إلى الإدارة لمزامنة مجلد Google Drive
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedVideos.map((v) => (
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
                  <h3 className="font-semibold line-clamp-2">{v.title}</h3>
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
      </main>
    </div>
  );
}
