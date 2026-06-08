import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { userLogin } from "@/lib/auth.functions";
import { setCurrentUser } from "@/lib/auth-gate";
import { Film, User, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await userLogin({ data: { username, password } });
      setCurrentUser(u);
      toast.success(`أهلاً ${u.display_name || u.username}`);
      navigate({ to: redirect || "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تسجيل الدخول");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow">
            <Film className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">ماريا</h1>
          <p className="text-sm text-muted-foreground mt-1">سجّل الدخول للمشاهدة</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم"
              autoComplete="username"
              className="w-full rounded-lg border border-border bg-input pr-10 pl-3 py-3 text-base"
              dir="ltr"
            />
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-input pr-10 pl-3 py-3 text-base"
              dir="ltr"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "..." : "دخول"}
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          الحسابات تُنشأ بواسطة الإدارة فقط.
          <br />
          <Link to="/admin/login" className="text-primary underline">
            دخول الإدارة
          </Link>
        </p>
      </form>
    </div>
  );
}
