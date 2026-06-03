import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listCategories, getUserInterests, setUserInterests } from "@/lib/video.functions";
import { getAnonId } from "@/lib/anon-id";
import { AppNav } from "@/components/AppNav";
import { toast } from "sonner";

export const Route = createFileRoute("/interests")({
  component: Page,
});

function Page() {
  const [anonId, setAnonId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAnonId(getAnonId());
  }, []);

  const cats = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const mine = useQuery({
    queryKey: ["interests", anonId],
    queryFn: () => getUserInterests({ data: { anon_id: anonId } }),
    enabled: !!anonId,
  });

  useEffect(() => {
    if (mine.data) setSelected(new Set(mine.data));
  }, [mine.data]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setUserInterests({
        data: { anon_id: anonId, category_ids: Array.from(selected) },
      });
      toast.success("تم التحديث");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">اهتماماتي</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {(cats.data ?? []).map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`rounded-xl border p-4 text-right ${
                  on ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className="font-medium">{c.name}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </main>
    </div>
  );
}
