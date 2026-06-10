import { Display } from "./display.js";
import {
  bitmapBytes,
  FONT_LINE_HEIGHT,
  lineTopOffset,
  maxTextLines,
  OLED_SCREENS,
} from "./deadzone.js";
import { OledFont } from "./oled-font.js";

const testFont = OledFont.loadSmall6x8();

function renderLineTestBitmap(
  width: number,
  height: number,
  lineCount: number,
): number[] {
  const display = new Display(width, height);
  display.clear();

  const count = Math.min(lineCount, maxTextLines(height));

  for (let i = 0; i < count; i++) {
    display.drawText({
      x: 0,
      y: lineTopOffset(i, height),
      text: `Zeile ${i + 1}`,
      font: testFont,
      color: 1,
      vertical_align: "top",
    });
  }

  return display.get();
}

export function buildLineTestFrame(
  lineCount = maxTextLines(64),
): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of OLED_SCREENS) {
    const raw = renderLineTestBitmap(
      screen.width,
      screen.height,
      lineCount,
    );
    const length = bitmapBytes(screen.width, screen.height);
    const bitmap = new Array(length).fill(0);
    for (let i = 0; i < Math.min(raw.length, length); i++) {
      bitmap[i] = raw[i]!;
    }
    frame[screen.key] = bitmap;
  }

  return frame;
}

export const lineTestInfo = {
  lineHeight: FONT_LINE_HEIGHT,
  maxLines64: maxTextLines(64),
} as const;
