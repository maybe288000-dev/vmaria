import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { tryAdminLogin } from "@/lib/auth-gate";
import { Lock, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [pw, setPw] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tryAdminLogin(pw)) {
      toast.success("مرحباً أيها المدير");
      navigate({ to: redirect || "/admin", replace: true });
    } else {
      toast.error("كلمة المرور غير صحيحة");
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
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">دخول الإدارة</h1>
        </div>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="كلمة مرور الإدارة"
            className="w-full rounded-lg border border-border bg-input pr-10 pl-3 py-3 text-base text-center tracking-widest"
            dir="ltr"
          />
        </div>
        <button
          type="submit"
          disabled={!pw}
          className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          دخول
        </button>
      </form>
    </div>
  );
}
