// Simple sessionStorage-based scroll + state restoration for the home grid
const SCROLL_KEY = "maria_home_scroll_v1";
const SEARCH_KEY = "maria_home_search_v1";

export function saveHomeState(scrollY: number, search: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SCROLL_KEY, String(scrollY));
    sessionStorage.setItem(SEARCH_KEY, search);
  } catch {
    /* ignore */
  }
}

export function loadHomeState(): { scrollY: number; search: string } {
  if (typeof window === "undefined") return { scrollY: 0, search: "" };
  try {
    const y = Number(sessionStorage.getItem(SCROLL_KEY) || "0");
    const s = sessionStorage.getItem(SEARCH_KEY) || "";
    return { scrollY: Number.isFinite(y) ? y : 0, search: s };
  } catch {
    return { scrollY: 0, search: "" };
  }
}

export function clearHomeState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SCROLL_KEY);
    sessionStorage.removeItem(SEARCH_KEY);
  } catch {
    /* ignore */
  }
}
