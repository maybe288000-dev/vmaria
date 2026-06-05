import { Link } from "@tanstack/react-router";
import { Film, Bookmark, Sparkles, Settings } from "lucide-react";
import { InstallPrompt } from "@/components/InstallPrompt";


export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Film className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>منصّة المشاهدة</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "rounded-md px-3 py-2 bg-accent text-accent-foreground" }}
            activeOptions={{ exact: true }}
          >
            الرئيسية
          </Link>
          <Link
            to="/saved"
            className="rounded-md px-3 py-2 hover:bg-accent inline-flex items-center gap-1"
            activeProps={{ className: "rounded-md px-3 py-2 bg-accent inline-flex items-center gap-1" }}
          >
            <Bookmark className="h-4 w-4" /> المحفوظات
          </Link>
          <Link
            to="/interests"
            className="rounded-md px-3 py-2 hover:bg-accent inline-flex items-center gap-1"
            activeProps={{ className: "rounded-md px-3 py-2 bg-accent inline-flex items-center gap-1" }}
          >
            <Sparkles className="h-4 w-4" /> اهتماماتي
          </Link>
          <Link
            to="/admin"
            className="rounded-md px-3 py-2 hover:bg-accent inline-flex items-center gap-1 text-muted-foreground"
            activeProps={{ className: "rounded-md px-3 py-2 bg-accent inline-flex items-center gap-1" }}
          >
            <Settings className="h-4 w-4" /> الإدارة
          </Link>
          <InstallPrompt />
        </nav>

      </div>
    </header>
  );
}
