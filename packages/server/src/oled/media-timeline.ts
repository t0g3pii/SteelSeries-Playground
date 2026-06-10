/** Formatiert Millisekunden als mm:ss oder h:mm:ss. */
export function formatMediaClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatMediaTimeline(positionMs: number, durationMs: number): string {
  return `${formatMediaClock(positionMs)}/${formatMediaClock(durationMs)}`;
}

export function hasValidMediaTimeline(
  hasTimeline: boolean,
  durationMs: number,
): boolean {
  return hasTimeline && durationMs > 0;
}

/** Anzeige-Tick pro OLED-Update (1 Hz). */
export const MEDIA_PLAYBACK_TICK_MS = 1_000;

/** >10 s hinter Spotify → auf API springen (z. B. nach Start / großes Vorwärts-Springen). */
export const MEDIA_PLAYBACK_BEHIND_SYNC_MS = 10_000;

/** Lokale Uhr liegt vor API → Zurückspulen (Toleranz gegen API-Rauschen). */
export const MEDIA_PLAYBACK_REWIND_SYNC_MS = 1_000;

/**
 * Lokaler Sekundenticker — Spotify-API nur bei Trackwechsel, Pause, Zurückspulen
 * oder wenn wir >10 s hinter der echten Position liegen.
 */
export function advancePlaybackDisplayMs(
  currentMs: number,
  apiMs: number,
  durationMs: number,
  status: string,
  trackChanged: boolean,
): number {
  if (durationMs <= 0) return 0;

  const api = Math.min(Math.max(0, apiMs), durationMs);

  if (trackChanged || status !== "Playing") {
    return api;
  }

  const behind = api - currentMs;
  const ahead = currentMs - api;

  // Zurückspulen: Anzeige läuft weiter, API springt zurück
  if (ahead >= MEDIA_PLAYBACK_REWIND_SYNC_MS) {
    return api;
  }

  // Deutlich hinter Spotify (Vorwärts-Sprung / nachgeholt)
  if (behind >= MEDIA_PLAYBACK_BEHIND_SYNC_MS) {
    return api;
  }

  const next = Math.min(durationMs, currentMs + MEDIA_PLAYBACK_TICK_MS);
  return Math.max(currentMs, next);
}

export function mediaTimelineTrackKey(
  title: string,
  durationMs: number,
): string {
  return `${title.trim()}\0${durationMs}`;
}
