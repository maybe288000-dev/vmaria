const KEY = "maria_auth_v1";
export const ADMIN_PASSWORD = "6969";

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function setAuthed(ok: boolean) {
  if (typeof window === "undefined") return;
  if (ok) localStorage.setItem(KEY, "1");
  else localStorage.removeItem(KEY);
}

export function tryLogin(password: string): boolean {
  if (password.trim() === ADMIN_PASSWORD) {
    setAuthed(true);
    return true;
  }
  return false;
}
