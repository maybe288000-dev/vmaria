export function extractFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

export function drivePreviewUrl(
  fileId: string,
  startSec?: number,
  opts?: { autoplay?: boolean; mute?: boolean },
): string {
  const params = new URLSearchParams();
  if (startSec && startSec > 0) params.set("t", String(Math.floor(startSec)));
  if (opts?.autoplay) params.set("autoplay", "1");
  if (opts?.mute) params.set("mute", "1");
  const q = params.toString();
  return `https://drive.google.com/file/d/${fileId}/preview${q ? `?${q}` : ""}`;
}

export function driveThumbnailUrl(fileId: string, size = 800): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
