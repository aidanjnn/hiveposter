/**
 * Daily seeds and puzzle numbers. Kept apart from words.ts on purpose: the client imports
 * this module, and it must never pull the word bank into the browser bundle.
 */

const DATE_SEED = /^\d{4}-\d{2}-\d{2}$/;

/** Day 1 of the daily puzzle. Share cards count from here. */
export const LAUNCH_DATE = "2026-10-05";

export function dayNumber(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}

export const LAUNCH_DAY = dayNumber(LAUNCH_DATE);

export function isDailySeed(seed: string): boolean {
  return DATE_SEED.test(seed);
}

/** Local date as YYYY-MM-DD, used as the daily seed. */
export function todaySeed(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days since launch for a date seed (0 on launch day); null for practice seeds. */
export function dayOffset(seed: string): number | null {
  return isDailySeed(seed) ? dayNumber(seed) - LAUNCH_DAY : null;
}

/** Share-card number: #1 on launch day; 0 for practice tables. */
export function puzzleNumber(seed: string): number {
  const offset = dayOffset(seed);
  return offset === null ? 0 : Math.max(1, offset + 1);
}
