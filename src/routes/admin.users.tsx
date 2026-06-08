import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  adminListAppUsers,
  adminUserDetail,
  adminCreateUser,
  adminResetPassword,
  adminSetBlocked,
  adminDeleteAppUser,
} from "@/lib/auth.functions";
import { ADMIN_PASSWORD, isAdminAuthed } from "@/lib/auth-gate";
import { supabase } from "@/integrations/supabase/client";
import { Ban, Trash2, X, UserPlus, KeyRound, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    if (!isAdminAuthed()) navigate({ to: "/admin/login", search: { redirect: "/admin/users" } });
  }, [navigate]);

  // ---- Live: refetch on changes to app_users, view_sessions, chat_messages ----
  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      if (selected) qc.invalidateQueries({ queryKey: ["app-user-detail", selected] });
    };
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_users" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "view_sessions" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, invalidate)
      .subscribe();
    // Also tick every 20s so "online" recomputes without DB changes
    const t = setInterval(invalidate, 20_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [qc, selected]);

  const users = useQuery({
    queryKey: ["app-users"],
    queryFn: () => adminListAppUsers({ data: { admin_password: ADMIN_PASSWORD } }),
    refetchOnWindowFocus: true,
  });
  const detail = useQuery({
    queryKey: ["app-user-detail", selected],
    queryFn: () =>
      adminUserDetail({ data: { admin_password: ADMIN_PASSWORD, user_id: selected! } }),
    enabled: !!selected,
  });

  const create = useMutation({
    mutationFn: (v: { username: string; password: string; display_name?: string }) =>
      adminCreateUser({ data: { admin_password: ADMIN_PASSWORD, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      setCreating(false);
      toast.success("تم إنشاء المستخدم");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر الإنشاء"),
  });

  const reset = useMutation({
    mutationFn: (v: { user_id: string; new_password: string }) =>
      adminResetPassword({ data: { admin_password: ADMIN_PASSWORD, ...v } }),
    onSuccess: () => {
      setResetFor(null);
      toast.success("تم تغيير كلمة المرور");
    },
    onError: (e: any) => toast.error(e?.message || "فشل التغيير"),
  });

  const block = useMutation({
    mutationFn: (v: { user_id: string; blocked: boolean }) =>
      adminSetBlocked({ data: { admin_password: ADMIN_PASSWORD, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      toast.success("تم");
    },
  });
  const del = useMutation({
    mutationFn: (user_id: string) =>
      adminDeleteAppUser({ data: { admin_password: ADMIN_PASSWORD, user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      setSelected(null);
      toast.success("تم حذف الحساب");
    },
  });

  const fmtSec = (s: number) => {
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}س ${m % 60}د` : `${m}د`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          المستخدمون ({users.data?.length ?? 0})
          <span className="inline-flex items-center gap-1 text-xs font-normal text-green-500">
            <Radio className="h-3 w-3 animate-pulse" /> مباشر
          </span>
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="mr-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          <UserPlus className="h-4 w-4" /> مستخدم جديد
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-accent/30 text-xs">
            <tr>
              <th className="p-2 text-right">المستخدم</th>
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2 text-right">آخر نشاط</th>
              <th className="p-2 text-right">المدة</th>
              <th className="p-2 text-right">جلسات</th>
              <th className="p-2 text-right">آخر فلم</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u: any) => (
              <tr key={u.id} className="border-t border-border hover:bg-accent/20">
                <td className="p-2">
                  <div className="font-medium">{u.display_name || u.username}</div>
                  <div className="text-[10px] text-muted-foreground" dir="ltr">@{u.username}</div>
                </td>
                <td className="p-2">
                  {u.blocked ? (
                    <span className="text-destructive text-xs">موقوف</span>
                  ) : u.online ? (
                    <span className="inline-flex items-center gap-1 text-green-500 text-xs">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> متّصل
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">غير متّصل</span>
                  )}
                </td>
                <td className="p-2 text-xs">
                  {u.last_activity_at || u.last_seen_at
                    ? new Date(u.last_activity_at || u.last_seen_at).toLocaleString("ar")
                    : "—"}
                </td>
                <td className="p-2">{fmtSec(u.total_seconds)}</td>
                <td className="p-2">{u.sessions}</td>
                <td className="p-2 text-xs truncate max-w-[180px]">
                  {u.last_video?.title ?? "—"}
                </td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setSelected(u.id)}
                      className="rounded px-2 py-1 text-xs bg-primary/10 text-primary"
                    >
                      عرض
                    </button>
                    <button
                      onClick={() => setResetFor({ id: u.id, username: u.username })}
                      className="rounded px-2 py-1 text-xs bg-blue-500/10 text-blue-600"
                      title="إعادة تعيين كلمة المرور"
                    >
                      <KeyRound className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => block.mutate({ user_id: u.id, blocked: !u.blocked })}
                      className="rounded px-2 py-1 text-xs bg-yellow-500/10 text-yellow-600"
                      title={u.blocked ? "إلغاء الإيقاف" : "إيقاف"}
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`حذف الحساب "${u.username}" نهائياً؟`)) del.mutate(u.id);
                      }}
                      className="rounded px-2 py-1 text-xs bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(users.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">
                  لا يوجد مستخدمون بعد — اضغط "مستخدم جديد" لإنشاء أول حساب.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {creating && (
        <CreateUserModal
          busy={create.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={(v) => create.mutate(v)}
        />
      )}

      {/* Reset password modal */}
      {resetFor && (
        <ResetPasswordModal
          username={resetFor.username}
          busy={reset.isPending}
          onCancel={() => setResetFor(null)}
          onSubmit={(pw) => reset.mutate({ user_id: resetFor.id, new_password: pw })}
        />
      )}

      {/* Detail modal */}
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
              <h3 className="font-bold">
                {detail.data?.user?.display_name || detail.data?.user?.username || "تفاصيل المستخدم"}
              </h3>
              <button onClick={() => setSelected(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">آخر المشاهدات</h4>
                <ul className="space-y-1 text-sm">
                  {(detail.data?.sessions ?? []).map((s: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 p-2 rounded bg-accent/20">
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
                          {fmtSec(s.seconds_watched)} •{" "}
                          {new Date(s.updated_at).toLocaleString("ar")}
                          {s.completed && " • اكتمل"}
                        </div>
                      </div>
                    </li>
                  ))}
                  {(detail.data?.sessions ?? []).length === 0 && (
                    <li className="text-muted-foreground">لا توجد مشاهدات</li>
                  )}
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

function CreateUserModal({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: { username: string; password: string; display_name?: string }) => void;
}) {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [displayName, setD] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ username, password, display_name: displayName || undefined });
        }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-3"
      >
        <h3 className="font-bold">إنشاء مستخدم جديد</h3>
        <input
          required
          value={username}
          onChange={(e) => setU(e.target.value)}
          placeholder="اسم المستخدم (a-z 0-9)"
          dir="ltr"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <input
          value={displayName}
          onChange={(e) => setD(e.target.value)}
          placeholder="اسم العرض (اختياري)"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setP(e.target.value)}
          placeholder="كلمة المرور (4 أحرف فأكثر)"
          dir="ltr"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm hover:bg-accent">
            إلغاء
          </button>
          <button
            disabled={busy || !username || !password}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            إنشاء
          </button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({
  username,
  busy,
  onCancel,
  onSubmit,
}: {
  username: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (newPassword: string) => void;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(pw);
        }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-3"
      >
        <h3 className="font-bold">
          إعادة تعيين كلمة المرور <span className="text-muted-foreground text-sm" dir="ltr">(@{username})</span>
        </h3>
        <input
          required
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="كلمة مرور جديدة"
          dir="ltr"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm hover:bg-accent">
            إلغاء
          </button>
          <button
            disabled={busy || pw.length < 4}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            تغيير
          </button>
        </div>
      </form>
    </div>
  );
}
