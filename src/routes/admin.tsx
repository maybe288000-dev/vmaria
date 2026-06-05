import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAuthed } from "@/lib/auth-gate";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthed()) navigate({ to: "/auth", search: { redirect: "/admin" } });
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-14 items-center gap-3 px-3 overflow-x-auto">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground shrink-0">
            ← العودة
          </Link>
          <h1 className="font-bold shrink-0">الإدارة</h1>
          <nav className="mr-auto flex gap-1 text-sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-1.5 hover:bg-accent shrink-0"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent shrink-0" }}
            >
              المزامنة
            </Link>
            <Link
              to="/admin/videos"
              className="rounded-md px-3 py-1.5 hover:bg-accent shrink-0"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent shrink-0" }}
            >
              الفيديوهات
            </Link>
            <Link
              to="/admin/users"
              className="rounded-md px-3 py-1.5 hover:bg-accent shrink-0"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent shrink-0" }}
            >
              المستخدمون
            </Link>
            <Link
              to="/admin/analytics"
              className="rounded-md px-3 py-1.5 hover:bg-accent shrink-0"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent shrink-0" }}
            >
              الإحصاءات
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
