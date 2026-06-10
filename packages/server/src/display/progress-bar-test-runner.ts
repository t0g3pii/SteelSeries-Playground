import {
  PROGRESS_BAR_TEST,
  PROGRESS_BAR_TEST_TOTAL_MS,
} from "../oled/progress-bar-test.js";
import { buildProgressBarFrame } from "../oled/progress-bar.js";
import type { DisplayFrame } from "../modules/types.js";

export type ProgressBarTestSendFrame = (frame: DisplayFrame) => Promise<void>;

export interface ProgressBarTestRunner {
  stop: () => void;
}

export function startProgressBarTest(
  sendFrame: ProgressBarTestSendFrame,
  onComplete: () => void,
): ProgressBarTestRunner {
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
    const atMs = percent * PROGRESS_BAR_TEST.stepMs;
    schedule(() => {
      void sendFrame(buildProgressBarFrame(percent));
    }, atMs);
  }

  schedule(() => {
    if (cancelled) return;
    cancelled = true;
    onComplete();
  }, PROGRESS_BAR_TEST_TOTAL_MS);

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
