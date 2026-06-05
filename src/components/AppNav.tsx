import { Link } from "@tanstack/react-router";
import { Film, Bookmark, MessageCircle, Settings, LogOut } from "lucide-react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { isAuthed, setAuthed } from "@/lib/auth-gate";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function AppNav() {
  const [authed, setAuthedState] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setAuthedState(isAuthed());
  }, []);

  const logout = () => {
    setAuthed(false);
    setAuthedState(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-3 gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Film className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>ماريا</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          <Link
            to="/"
            className="rounded-md px-2 py-2 hover:bg-accent shrink-0"
            activeProps={{ className: "rounded-md px-2 py-2 bg-accent text-accent-foreground shrink-0" }}
            activeOptions={{ exact: true }}
          >
            الرئيسية
          </Link>
          <Link
            to="/chat"
            className="rounded-md px-2 py-2 hover:bg-accent inline-flex items-center gap-1 shrink-0"
            activeProps={{ className: "rounded-md px-2 py-2 bg-accent inline-flex items-center gap-1 shrink-0" }}
          >
            <MessageCircle className="h-4 w-4" /> ماريا
          </Link>
          {authed && (
            <Link
              to="/saved"
              className="rounded-md px-2 py-2 hover:bg-accent inline-flex items-center gap-1 shrink-0"
              activeProps={{ className: "rounded-md px-2 py-2 bg-accent inline-flex items-center gap-1 shrink-0" }}
            >
              <Bookmark className="h-4 w-4" /> المحفوظات
            </Link>
          )}
          {authed && (
            <Link
              to="/admin"
              className="rounded-md px-2 py-2 hover:bg-accent inline-flex items-center gap-1 text-muted-foreground shrink-0"
              activeProps={{ className: "rounded-md px-2 py-2 bg-accent inline-flex items-center gap-1 shrink-0" }}
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <InstallPrompt />
          {authed && (
            <button
              onClick={logout}
              className="rounded-md px-2 py-2 hover:bg-accent text-muted-foreground shrink-0"
              aria-label="تسجيل خروج"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
