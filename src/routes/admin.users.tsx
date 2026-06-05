import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listUsers, getUserDetail, blockUser, deleteUser } from "@/lib/video.functions";
import { isAuthed } from "@/lib/auth-gate";
import { Ban, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) navigate({ to: "/auth", search: { redirect: "/admin/users" } });
  }, [navigate]);

  const users = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  const detail = useQuery({
    queryKey: ["user-detail", selected],
    queryFn: () => getUserDetail({ data: { anon_id: selected! } }),
    enabled: !!selected,
  });

  const block = useMutation({
    mutationFn: (v: { anon_id: string; block: boolean }) => blockUser({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم");
    },
  });
  const del = useMutation({
    mutationFn: (anon_id: string) => deleteUser({ data: { anon_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setSelected(null);
      toast.success("تم حذف الحساب");
    },
  });

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}س ${m % 60}د` : `${m}د`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">المستخدمون ({users.data?.length ?? 0})</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-xs">
            <tr>
              <th className="p-2 text-right">معرّف</th>
              <th className="p-2 text-right">آخر نشاط</th>
              <th className="p-2 text-right">المدة</th>
              <th className="p-2 text-right">جلسات</th>
              <th className="p-2 text-right">رسائل</th>
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u: any) => (
              <tr key={u.anon_id} className="border-t border-border hover:bg-accent/20">
                <td className="p-2 font-mono text-xs">{u.anon_id.slice(0, 8)}…</td>
                <td className="p-2 text-xs">
                  {new Date(u.last_seen).toLocaleString("ar")}
                </td>
                <td className="p-2">{fmt(u.total_seconds)}</td>
                <td className="p-2">{u.sessions}</td>
                <td className="p-2">{u.messages}</td>
                <td className="p-2">
                  {u.blocked ? (
                    <span className="text-destructive text-xs">موقوف</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">نشط</span>
                  )}
                </td>
                <td className="p-2 flex gap-1">
                  <button
                    onClick={() => setSelected(u.anon_id)}
                    className="rounded px-2 py-1 text-xs bg-primary/10 text-primary"
                  >
                    عرض
                  </button>
                  <button
                    onClick={() =>
                      block.mutate({ anon_id: u.anon_id, block: !u.blocked })
                    }
                    className="rounded px-2 py-1 text-xs bg-yellow-500/10 text-yellow-600"
                    title={u.blocked ? "إلغاء الإيقاف" : "إيقاف"}
                  >
                    <Ban className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("حذف الحساب نهائياً؟")) del.mutate(u.anon_id);
                    }}
                    className="rounded px-2 py-1 text-xs bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
            {(users.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">
                  لا يوجد مستخدمون بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-border flex justify-between items-center p-4">
              <h3 className="font-bold">تفاصيل المستخدم</h3>
              <button onClick={() => setSelected(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">آخر المشاهدات</h4>
                <ul className="space-y-1 text-sm">
                  {(detail.data?.sessions ?? []).map((s: any, i: number) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 p-2 rounded bg-accent/20"
                    >
                      {s.video?.thumbnail_url && (
                        <img
                          src={s.video.thumbnail_url}
                          alt=""
                          className="h-10 w-16 object-cover rounded"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{s.video?.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmt(s.seconds_watched)} •{" "}
                          {new Date(s.updated_at).toLocaleString("ar")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">محادثات ماريا</h4>
                <ul className="space-y-2 text-sm">
                  {(detail.data?.messages ?? []).map((m: any, i: number) => (
                    <li
                      key={i}
                      className={`p-2 rounded ${
                        m.role === "user" ? "bg-primary/10" : "bg-accent/20"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {m.role === "user" ? "المستخدم" : "ماريا"} •{" "}
                        {new Date(m.created_at).toLocaleString("ar")}
                      </div>
                      <div className="whitespace-pre-line">{m.content}</div>
                    </li>
                  ))}
                  {(detail.data?.messages ?? []).length === 0 && (
                    <li className="text-muted-foreground">لا توجد محادثات</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
