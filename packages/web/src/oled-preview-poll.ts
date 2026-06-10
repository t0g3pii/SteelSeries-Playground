import type { OledFrameKind } from "./api";

/** OLED-Tests senden bis zu alle ~100 ms — Vorschau dicht daran halten. */
export const FAST_PREVIEW_INTERVAL_MS = 80;

/** Medien-Modul: gleiches 1×/s-Takt wie GameDAC. */
export const MEDIA_PREVIEW_INTERVAL_MS = 1_000;

const OLED_TEST_FRAME_KINDS: ReadonlySet<OledFrameKind> = new Set([
  "feature-test",
  "progress-bar-test",
  "gauge-test",
  "component-test",
]);

export function isOledTestFrame(kind: OledFrameKind): boolean {
  return OLED_TEST_FRAME_KINDS.has(kind);
}

export function getOledPreviewPollIntervalMs(
  kind: OledFrameKind,
  running: boolean,
): number | null {
  if (!running) return null;
  if (isOledTestFrame(kind)) return FAST_PREVIEW_INTERVAL_MS;
  if (kind === "media") return MEDIA_PREVIEW_INTERVAL_MS;
  return null;
}

/** @deprecated Nutze getOledPreviewPollIntervalMs. */
export function needsFastPreviewPoll(
  kind: OledFrameKind,
  running: boolean,
): boolean {
  return getOledPreviewPollIntervalMs(kind, running) !== null;
}
