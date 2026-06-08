import { Link } from "@tanstack/react-router";
import { Film, Bookmark, Settings, LogOut, LogIn, User } from "lucide-react";
import { InstallPrompt } from "@/components/InstallPrompt";
import {
  getCurrentUser,
  isUserAuthed,
  isAdminAuthed,
  setCurrentUser,
  setAdminAuthed,
  type CurrentUser,
} from "@/lib/auth-gate";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function AppNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [admin, setAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getCurrentUser());
    setAdmin(isAdminAuthed());
  }, []);

  const logoutUser = () => {
    setCurrentUser(null);
    setUser(null);
    navigate({ to: "/" });
  };
  const logoutAdmin = () => {
    setAdminAuthed(false);
    setAdmin(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur safe-top">
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
          {user && (
            <Link
              to="/saved"
              className="rounded-md px-2 py-2 hover:bg-accent inline-flex items-center gap-1 shrink-0"
              activeProps={{ className: "rounded-md px-2 py-2 bg-accent inline-flex items-center gap-1 shrink-0" }}
            >
              <Bookmark className="h-4 w-4" /> المحفوظات
            </Link>
          )}
          {admin && (
            <Link
              to="/admin"
              className="rounded-md px-2 py-2 hover:bg-accent inline-flex items-center gap-1 text-muted-foreground shrink-0"
              activeProps={{ className: "rounded-md px-2 py-2 bg-accent inline-flex items-center gap-1 shrink-0" }}
              aria-label="الإدارة"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <InstallPrompt />
          {user ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-2 text-muted-foreground shrink-0">
                <User className="h-4 w-4" /> {user.display_name || user.username}
              </span>
              <button
                onClick={logoutUser}
                className="rounded-md px-2 py-2 hover:bg-accent text-muted-foreground shrink-0"
                aria-label="تسجيل خروج"
                title="تسجيل خروج"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md px-2 py-2 hover:bg-accent inline-flex items-center gap-1 shrink-0"
            >
              <LogIn className="h-4 w-4" /> دخول
            </Link>
          )}
          {admin && (
            <button
              onClick={logoutAdmin}
              className="rounded-md px-2 py-2 hover:bg-accent text-xs text-muted-foreground shrink-0"
              title="خروج الإدارة"
            >
              خروج الإدارة
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
