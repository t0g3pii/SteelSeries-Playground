/**
 * Standalone Progressbar-Test — später in FEATURE_TEST_SEQUENCE einbaubar.
 */
export const PROGRESS_BAR_TEST = {
  /** 0 → 100 % in 100 Schritten à 1 s. */
  durationSec: 100,
  stepMs: 1_000,
} as const;

export const PROGRESS_BAR_TEST_TOTAL_MS =
  PROGRESS_BAR_TEST.durationSec * PROGRESS_BAR_TEST.stepMs;
