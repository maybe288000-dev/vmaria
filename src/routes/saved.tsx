import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listSavedVideos } from "@/lib/video.functions";
import { getAnonId } from "@/lib/anon-id";
import { AppNav } from "@/components/AppNav";
import { Bookmark, Film } from "lucide-react";

export const Route = createFileRoute("/saved")({
  component: Saved,
});

function Saved() {
  const [anonId, setAnonId] = useState<string>("");
  useEffect(() => setAnonId(getAnonId()), []);
  const q = useQuery({
    queryKey: ["saved", anonId],
    queryFn: () => listSavedVideos({ data: { anon_id: anonId } }),
    enabled: !!anonId,
  });
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 inline-flex items-center gap-2">
          <Bookmark className="h-6 w-6" /> المحفوظات
        </h1>
        {q.isLoading ? (
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        ) : !q.data || q.data.length === 0 ? (
          <p className="text-muted-foreground">لا توجد فيديوهات محفوظة بعد.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {q.data.map((v) => (
              <Link
                key={v.id}
                to="/videos/$id"
                params={{ id: v.id }}
                className="group rounded-xl overflow-hidden bg-card border border-border"
              >
                <div className="relative aspect-video bg-muted">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
                  ) : (
                    <Film className="h-10 w-10 text-muted-foreground m-auto" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold line-clamp-2">{v.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
