import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display IP string or N/A when empty (after trim). Prefer `nonEmptyTrim` when hiding empty fields. */
export function formatIpDisplay(ip: string | null | undefined): string {
  const t = ip?.trim();
  return t ? t : 'N/A';
}

/** Non-empty trimmed string, or null (for conditional UI). */
export function nonEmptyTrim(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t || null;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
