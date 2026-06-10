import { buildClockFrame } from "./clock.js";
import { buildEqualizerFrame } from "./equalizer.js";
import { buildMarqueeFrame, MARQUEE_TEXT } from "./marquee.js";
import { OledFont } from "./oled-font.js";
import { buildSevenSegmentFrame } from "./seven-segment.js";
import { buildSparklineFrame } from "./sparkline.js";
import { buildSpinnerFrame } from "./spinner.js";
import {
  buildStatusTileFrame,
  STATUS_TILE_VARIANTS,
} from "./status-tile.js";
import { buildVolumeBarsFrame, VOLUME_SEGMENT_COUNT } from "./volume-bars.js";

export type ComponentTestId =
  | "volume-bars"
  | "sparkline"
  | "clock"
  | "status-tile"
  | "equalizer"
  | "spinner"
  | "marquee"
  | "seven-segment";

export interface ComponentTestMeta {
  id: ComponentTestId;
  label: string;
  totalMs: number;
}

export const COMPONENT_TEST_LIST: ComponentTestMeta[] = [
  { id: "volume-bars", label: "Volume-Balken", totalMs: 12_000 },
  { id: "sparkline", label: "Sparkline", totalMs: 15_000 },
  { id: "clock", label: "Uhr", totalMs: 10_000 },
  { id: "status-tile", label: "Status-Kachel", totalMs: 12_000 },
  { id: "equalizer", label: "Equalizer", totalMs: 10_000 },
  { id: "spinner", label: "Spinner", totalMs: 8_000 },
  { id: "marquee", label: "Marquee", totalMs: 15_000 },
  { id: "seven-segment", label: "7-Segment", totalMs: 11_000 },
];

export type PhaseSchedule = (fn: () => void, delayMs: number) => void;
export type PhaseSend = (frame: Record<string, number[]>) => void;

export function getComponentTestTotalMs(id: ComponentTestId): number {
  return COMPONENT_TEST_LIST.find((t) => t.id === id)?.totalMs ?? 10_000;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function scheduleVolumeBars(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("volume-bars");
  for (let level = 0; level <= VOLUME_SEGMENT_COUNT; level++) {
    schedule(
      () => send(buildVolumeBarsFrame(level)),
      startAtMs + level * 1_000,
    );
  }
  return totalMs;
}

function scheduleSparkline(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("sparkline");
  const samples: number[] = [];
  for (let tick = 0; tick <= 30; tick++) {
    schedule(() => {
      const next = 0.35 + pseudoRandom(tick * 1.7) * 0.55;
      samples.push(next);
      if (samples.length > 40) samples.shift();
      send(buildSparklineFrame(samples));
    }, startAtMs + tick * 500);
  }
  return totalMs;
}

function scheduleClock(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("clock");
  for (let tick = 0; tick <= 10; tick++) {
    schedule(
      () => send(buildClockFrame(new Date())),
      startAtMs + tick * 1_000,
    );
  }
  return totalMs;
}

function scheduleStatusTile(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("status-tile");
  STATUS_TILE_VARIANTS.forEach((variant, index) => {
    schedule(
      () => send(buildStatusTileFrame(variant)),
      startAtMs + index * 3_000,
    );
  });
  return totalMs;
}

function scheduleEqualizer(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("equalizer");
  for (let tick = 0; tick <= 100; tick++) {
    schedule(() => {
      const heights = Array.from({ length: 9 }, (_, i) =>
        Math.round(20 + pseudoRandom(tick * 3.1 + i) * 80),
      );
      send(buildEqualizerFrame(heights));
    }, startAtMs + tick * 100);
  }
  return totalMs;
}

function scheduleSpinner(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("spinner");
  for (let tick = 0; tick <= 80; tick++) {
    schedule(
      () => send(buildSpinnerFrame(tick)),
      startAtMs + tick * 100,
    );
  }
  return totalMs;
}

const MARQUEE_STEP_MS = 120;

function scheduleMarquee(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("marquee");
  const font = OledFont.loadSmall6x8();
  const loopWidthPx = MARQUEE_TEXT.length * font.width;
  const ticks = Math.floor(totalMs / MARQUEE_STEP_MS);

  for (let tick = 0; tick <= ticks; tick++) {
    const pixelOffset = Math.round((tick / ticks) * loopWidthPx);
    schedule(
      () => send(buildMarqueeFrame(pixelOffset)),
      startAtMs + tick * MARQUEE_STEP_MS,
    );
  }
  return totalMs;
}

function scheduleSevenSegment(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const totalMs = getComponentTestTotalMs("seven-segment");
  for (let value = 0; value <= 100; value++) {
    schedule(
      () => send(buildSevenSegmentFrame(value)),
      startAtMs + value * 100,
    );
  }
  return totalMs;
}

const SCHEDULERS: Record<
  ComponentTestId,
  (schedule: PhaseSchedule, send: PhaseSend, startAtMs: number) => number
> = {
  "volume-bars": scheduleVolumeBars,
  sparkline: scheduleSparkline,
  clock: scheduleClock,
  "status-tile": scheduleStatusTile,
  equalizer: scheduleEqualizer,
  spinner: scheduleSpinner,
  marquee: scheduleMarquee,
  "seven-segment": scheduleSevenSegment,
};

export function isComponentTestId(value: string): value is ComponentTestId {
  return value in SCHEDULERS;
}

export function scheduleComponentTest(
  id: ComponentTestId,
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs = 0,
): number {
  return SCHEDULERS[id](schedule, send, startAtMs);
}
