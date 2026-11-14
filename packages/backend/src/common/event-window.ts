// Events only store a local date and wall-clock time, with no timezone. The server's "today" is the UTC date,
// which rolls over at 6-7pm in the US, so comparing against it hides events that are still running.
// An event dated X can still be going on until about 4am the next day in the westernmost US zone (UTC-10),
// i.e. 14:00 UTC on X+1, so the earliest date that may still be live is the UTC date 14 hours ago.
const LATEST_US_OFFSET_HOURS = 10;
const AFTER_MIDNIGHT_GRACE_HOURS = 4;

export const EVENT_LIVE_WINDOW_MS =
  (LATEST_US_OFFSET_HOURS + AFTER_MIDNIGHT_GRACE_HOURS) * 60 * 60 * 1000;

/** Events dated before this (YYYY-MM-DD) are over everywhere in the US; this date and later may still be live. */
export function earliestLiveEventDate(nowMs: number = Date.now()): string {
  return new Date(nowMs - EVENT_LIVE_WINDOW_MS).toISOString().slice(0, 10);
}
