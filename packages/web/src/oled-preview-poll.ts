import type { OledFrameKind } from "./api";

/** OLED-Tests senden bis zu alle ~100 ms — Vorschau dicht daran halten. */
export const FAST_PREVIEW_INTERVAL_MS = 80;

const OLED_TEST_FRAME_KINDS: ReadonlySet<OledFrameKind> = new Set([
  "feature-test",
  "progress-bar-test",
  "gauge-test",
  "component-test",
]);

export function isOledTestFrame(kind: OledFrameKind): boolean {
  return OLED_TEST_FRAME_KINDS.has(kind);
}
