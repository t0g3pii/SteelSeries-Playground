/**
 * Standalone Gauge-Test — später in FEATURE_TEST_SEQUENCE einbaubar.
 */
export const GAUGE_TEST = {
  durationSec: 100,
  stepMs: 1_000,
} as const;

export const GAUGE_TEST_TOTAL_MS = GAUGE_TEST.durationSec * GAUGE_TEST.stepMs;
