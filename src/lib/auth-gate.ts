// Identity & gating for Maria
// - Regular user: created by admin, stored in localStorage as `maria_user_v1`
// - Admin: simple password gate (6969), stored as `maria_admin_v1`

export const ADMIN_PASSWORD = "6969";

const USER_KEY = "maria_user_v1";
const ADMIN_KEY = "maria_admin_v1";

export type CurrentUser = {
  id: string;
  username: string;
  display_name?: string | null;
};

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.id || !u?.username) return null;
    return u as CurrentUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(u: CurrentUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export function isUserAuthed(): boolean {
  return !!getCurrentUser();
}

// ---- Admin ----
export function isAdminAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_KEY) === "1";
}

export function setAdminAuthed(ok: boolean) {
  if (typeof window === "undefined") return;
  if (ok) localStorage.setItem(ADMIN_KEY, "1");
  else localStorage.removeItem(ADMIN_KEY);
}

export function tryAdminLogin(password: string): boolean {
  if (password.trim() === ADMIN_PASSWORD) {
    setAdminAuthed(true);
    return true;
  }
  return false;
}

// ---- Back-compat shims (old code may still import these) ----
export function isAuthed(): boolean {
  return isUserAuthed();
}
export function setAuthed(ok: boolean) {
  if (!ok) setCurrentUser(null);
}
