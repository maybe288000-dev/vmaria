// Identity used for all activity rows in the DB.
// If a Maria user is logged in, we use their `app_users.id`.
// Otherwise we fall back to a per-browser anonymous UUID so guest browsing
// (e.g. trailers carousel) still works.

const KEY = "anon_id";
const USER_KEY = "maria_user_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonId(): string {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) return u.id as string;
    }
  } catch {
    /* ignore */
  }
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const ONBOARDED_KEY = "onboarded_v1";
export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}
export function markOnboarded() {
  if (typeof window !== "undefined") localStorage.setItem(ONBOARDED_KEY, "1");
}
