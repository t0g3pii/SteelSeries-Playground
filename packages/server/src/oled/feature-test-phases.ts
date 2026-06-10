import { buildDeadzoneTestFrame } from "./deadzone.js";
import { buildPixelCheckFrame } from "./checkerboard-test.js";
import { buildGaugeFrame } from "./gauge.js";
import { buildLineTestFrame } from "./line-test.js";
import { buildProgressBarFrame } from "./progress-bar.js";
import { FEATURE_TEST_SEQUENCE } from "./feature-test.js";

export type PhaseSchedule = (fn: () => void, delayMs: number) => void;
export type PhaseSend = (frame: Record<string, number[]>) => void;

export function schedulePixelCheckPhase(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const { durationSec, toggleMs } = FEATURE_TEST_SEQUENCE.pixelCheck;
  let inverted = false;

  for (let sec = durationSec; sec >= 1; sec--) {
    const atMs = startAtMs + (durationSec - sec) * toggleMs;
    const countdown = sec;
    const flip = inverted;
    schedule(() => send(buildPixelCheckFrame(flip, countdown)), atMs);
    inverted = !inverted;
  }

  return durationSec * toggleMs;
}

export function scheduleLineTestPhase(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const { durationMs, lineCount } = FEATURE_TEST_SEQUENCE.lineTest;
  schedule(() => send(buildLineTestFrame(lineCount)), startAtMs);
  return durationMs;
}

export function scheduleDeadzonePhase(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const { durationMs } = FEATURE_TEST_SEQUENCE.deadzone;
  schedule(() => send(buildDeadzoneTestFrame()), startAtMs);
  return durationMs;
}

export function scheduleProgressBarPhase(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const { durationMs, stepMs } = FEATURE_TEST_SEQUENCE.progressBar;

  for (let percent = 0; percent <= 100; percent++) {
    schedule(
      () => send(buildProgressBarFrame(percent)),
      startAtMs + percent * stepMs,
    );
  }

  return durationMs;
}

export function scheduleGaugePhase(
  schedule: PhaseSchedule,
  send: PhaseSend,
  startAtMs: number,
): number {
  const { durationMs, stepMs } = FEATURE_TEST_SEQUENCE.gauge;

  for (let percent = 0; percent <= 100; percent++) {
    schedule(
      () => send(buildGaugeFrame(percent)),
      startAtMs + percent * stepMs,
    );
  }

  return durationMs;
}
