import { scheduleComponentTest } from "../oled/component-tests.js";
import { FEATURE_TEST_SEQUENCE } from "../oled/feature-test.js";
import { FEATURE_TEST_TOTAL_MS } from "../oled/feature-test.js";
import {
  scheduleDeadzonePhase,
  scheduleGaugePhase,
  scheduleLineTestPhase,
  schedulePixelCheckPhase,
  scheduleProgressBarPhase,
} from "../oled/feature-test-phases.js";
import type { DisplayFrame } from "../modules/types.js";

export type FeatureTestSendFrame = (frame: DisplayFrame) => Promise<void>;

export interface FeatureTestRunner {
  stop: () => void;
}

export function startFeatureTest(
  sendFrame: FeatureTestSendFrame,
  onComplete: () => void,
): FeatureTestRunner {
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const schedule = (fn: () => void, delayMs: number): void => {
    const id = setTimeout(() => {
      if (cancelled) return;
      fn();
    }, delayMs);
    timeouts.push(id);
  };

  const send = (frame: Record<string, number[]>): void => {
    void sendFrame(frame);
  };

  let cursor = 0;

  cursor += schedulePixelCheckPhase(schedule, send, cursor);
  cursor += scheduleLineTestPhase(schedule, send, cursor);
  cursor += scheduleDeadzonePhase(schedule, send, cursor);
  cursor += scheduleProgressBarPhase(schedule, send, cursor);
  cursor += scheduleGaugePhase(schedule, send, cursor);

  for (const componentId of FEATURE_TEST_SEQUENCE.components) {
    cursor += scheduleComponentTest(componentId, schedule, send, cursor);
  }

  schedule(() => {
    if (cancelled) return;
    cancelled = true;
    onComplete();
  }, FEATURE_TEST_TOTAL_MS);

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
