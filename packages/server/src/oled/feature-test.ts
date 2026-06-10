import { maxTextLines } from "./deadzone.js";
import {
  COMPONENT_TEST_LIST,
  type ComponentTestId,
} from "./component-tests.js";

/**
 * Feature-Test-Sequenz — Layout-Verifikation + alle UI-Komponenten.
 */
export const FEATURE_TEST_SEQUENCE = {
  pixelCheck: {
    durationSec: 6,
    toggleMs: 1_000,
    label: "Pixel-Check",
  },
  lineTest: {
    durationMs: 5_000,
    lineCount: maxTextLines(64),
  },
  deadzone: {
    durationMs: 5_000,
  },
  /** Im Suite-Lauf: 0→100 % in 10 s (Standalone-Test bleibt 100 s). */
  progressBar: {
    durationMs: 10_000,
    stepMs: 100,
  },
  gauge: {
    durationMs: 10_000,
    stepMs: 100,
  },
  components: [
    "volume-bars",
    "sparkline",
    "clock",
    "status-tile",
    "equalizer",
    "spinner",
    "marquee",
    "seven-segment",
  ] as const satisfies readonly ComponentTestId[],
} as const;

const LAYOUT_TOTAL_MS =
  FEATURE_TEST_SEQUENCE.pixelCheck.durationSec * 1_000 +
  FEATURE_TEST_SEQUENCE.lineTest.durationMs +
  FEATURE_TEST_SEQUENCE.deadzone.durationMs +
  FEATURE_TEST_SEQUENCE.progressBar.durationMs +
  FEATURE_TEST_SEQUENCE.gauge.durationMs;

const COMPONENTS_TOTAL_MS = COMPONENT_TEST_LIST.reduce(
  (sum, test) => sum + test.totalMs,
  0,
);

export const FEATURE_TEST_TOTAL_MS = LAYOUT_TOTAL_MS + COMPONENTS_TOTAL_MS;

export const FEATURE_TEST_PHASE_COUNT =
  5 + FEATURE_TEST_SEQUENCE.components.length;
