import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "@/lib/video.functions";

export const Route = createFileRoute("/admin/analytics")({
  component: Analytics,
});

function Analytics() {
  const q = useQuery({ queryKey: ["analytics"], queryFn: () => getAnalytics() });
  if (q.isLoading) return <p className="text-muted-foreground">جارٍ التحميل...</p>;
  const t = q.data?.totals;
  const list = q.data?.per_video ?? [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="فيديوهات" value={t?.videos ?? 0} />
        <Stat label="مشاهدات" value={t?.views ?? 0} />
        <Stat label="مشاهدون فريدون" value={t?.unique_viewers ?? 0} />
        <Stat
          label="إجمالي الدقائق"
          value={Math.round((t?.total_seconds ?? 0) / 60)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-right">الفيديو</th>
              <th className="p-3">مشاهدات</th>
              <th className="p-3">فريدون</th>
              <th className="p-3">دقائق</th>
              <th className="p-3">إكمالات</th>
              <th className="p-3">إعجاب</th>
              <th className="p-3">حفظ</th>
              <th className="p-3">تعليقات</th>
              <th className="p-3">تقييم</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v: any) => (
              <tr key={v.id} className="border-t border-border">
                <td className="p-3 text-right font-medium line-clamp-1">{v.title}</td>
                <td className="p-3 text-center">{v.views}</td>
                <td className="p-3 text-center">{v.unique_viewers}</td>
                <td className="p-3 text-center">{Math.round(v.total_seconds / 60)}</td>
                <td className="p-3 text-center">{v.completions}</td>
                <td className="p-3 text-center">{v.likes}</td>
                <td className="p-3 text-center">{v.saves}</td>
                <td className="p-3 text-center">{v.comments}</td>
                <td className="p-3 text-center">{v.avg_rating ?? "—"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  لا توجد بيانات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
