import {
  getComponentTestTotalMs,
  scheduleComponentTest,
  type ComponentTestId,
} from "../oled/component-tests.js";
import type { DisplayFrame } from "../modules/types.js";

export type ComponentTestSendFrame = (frame: DisplayFrame) => Promise<void>;

export interface ComponentTestRunner {
  stop: () => void;
}

export function startComponentTest(
  id: ComponentTestId,
  sendFrame: ComponentTestSendFrame,
  onComplete: () => void,
): ComponentTestRunner {
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const schedule = (fn: () => void, delayMs: number): void => {
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      fn();
    }, delayMs);
    timeouts.push(timeoutId);
  };

  scheduleComponentTest(id, schedule, (frame) => {
    void sendFrame(frame);
  });

  schedule(() => {
    if (cancelled) return;
    cancelled = true;
    onComplete();
  }, getComponentTestTotalMs(id));

  return {
    stop: () => {
      cancelled = true;
      for (const timeoutId of timeouts) {
        clearTimeout(timeoutId);
      }
      timeouts.length = 0;
    },
  };
}
