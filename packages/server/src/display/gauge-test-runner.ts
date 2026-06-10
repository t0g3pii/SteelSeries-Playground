import { GAUGE_TEST, GAUGE_TEST_TOTAL_MS } from "../oled/gauge-test.js";
import { buildGaugeFrame } from "../oled/gauge.js";
import type { DisplayFrame } from "../modules/types.js";

export type GaugeTestSendFrame = (frame: DisplayFrame) => Promise<void>;

export interface GaugeTestRunner {
  stop: () => void;
}

export function startGaugeTest(
  sendFrame: GaugeTestSendFrame,
  onComplete: () => void,
): GaugeTestRunner {
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const schedule = (fn: () => void, delayMs: number): void => {
    const id = setTimeout(() => {
      if (cancelled) return;
      fn();
    }, delayMs);
    timeouts.push(id);
  };

  for (let percent = 0; percent <= 100; percent++) {
    const atMs = percent * GAUGE_TEST.stepMs;
    schedule(() => {
      void sendFrame(buildGaugeFrame(percent));
    }, atMs);
  }

  schedule(() => {
    if (cancelled) return;
    cancelled = true;
    onComplete();
  }, GAUGE_TEST_TOTAL_MS);

  return {
    stop: () => {
      cancelled = true;
      for (const id of timeouts) {
        clearTimeout(id);
      }
      timeouts.length = 0;
    },
  };
}
