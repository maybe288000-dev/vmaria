import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listCategories, setUserInterests } from "@/lib/video.functions";
import { getAnonId, markOnboarded } from "@/lib/anon-id";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [anonId, setAnonId] = useState<string>("");

  useEffect(() => {
    setAnonId(getAnonId());
  }, []);

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const submit = async () => {
    if (!anonId) return;
    setSaving(true);
    try {
      await setUserInterests({
        data: { anon_id: anonId, category_ids: Array.from(selected) },
      });
      markOnboarded();
      toast.success("تم حفظ اهتماماتك");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border border-border rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">ما الذي يثير اهتمامك؟</h1>
        <p className="text-muted-foreground mb-6">
          اختر التصنيفات التي تحبها لنقترح عليك فيديوهات مناسبة. يمكنك تغييرها لاحقاً.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {(cats.data ?? []).map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`rounded-xl border p-4 text-right transition-all ${
                  on
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className="font-medium">{c.name}</div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              markOnboarded();
              navigate({ to: "/" });
            }}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            تخطّي
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : `متابعة (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
