import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← العودة للموقع
          </Link>
          <h1 className="font-bold">لوحة الإدارة</h1>
          <nav className="mr-auto flex gap-1 text-sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-1.5 hover:bg-accent"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent" }}
            >
              المزامنة
            </Link>
            <Link
              to="/admin/videos"
              className="rounded-md px-3 py-1.5 hover:bg-accent"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent" }}
            >
              الفيديوهات
            </Link>
            <Link
              to="/admin/analytics"
              className="rounded-md px-3 py-1.5 hover:bg-accent"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent" }}
            >
              الإحصاءات
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
