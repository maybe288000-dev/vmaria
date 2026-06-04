export function extractFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

export function drivePreviewUrl(fileId: string, startSec?: number): string {
  const base = `https://drive.google.com/file/d/${fileId}/preview`;
  return startSec && startSec > 0 ? `${base}?t=${Math.floor(startSec)}` : base;
}

export function driveThumbnailUrl(fileId: string, size = 800): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
