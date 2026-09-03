import { useEffect, useState } from "react";

export type NowPlaying = { videoId: string; title?: string; t?: number } | null;

let current: NowPlaying = null;
const listeners = new Set<(value: NowPlaying) => void>();

export function setNowPlaying(next: NowPlaying) {
  current = next;
  listeners.forEach((listener) => listener(current));
}

export function getNowPlaying() {
  return current;
}

export function useNowPlaying(): NowPlaying {
  const [value, setValue] = useState<NowPlaying>(current);
  useEffect(() => {
    setValue(current);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
