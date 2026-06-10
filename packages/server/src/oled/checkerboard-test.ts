import { Display } from "./display.js";
import {
  bitmapBytes,
  contentAreaHeight,
  contentPadding,
  deviceVisibleHeight,
  FONT_LINE_HEIGHT,
  OLED_SCREENS,
} from "./deadzone.js";
import { OledFont } from "./oled-font.js";

const testFont = OledFont.loadSmall6x8();

function checkerColor(index: number, inverted: boolean): 0 | 1 {
  const normal: 0 | 1 = index % 2 === 0 ? 1 : 0;
  return inverted ? ((1 - normal) as 0 | 1) : normal;
}

function drawTopEdge(display: Display, width: number, inverted: boolean): void {
  for (let x = 0; x < width; x++) {
    display.drawPixel(x, 0, checkerColor(x, inverted));
  }
}

function drawLeftEdge(
  display: Display,
  height: number,
  inverted: boolean,
): void {
  for (let y = 0; y < height; y++) {
    display.drawPixel(0, y, checkerColor(y, inverted));
  }
}

function renderPixelCheckBitmap(
  width: number,
  height: number,
  inverted: boolean,
  countdown: number,
): number[] {
  const display = new Display(width, height);
  display.clear();

  const visibleH = deviceVisibleHeight(height);

  drawTopEdge(display, width, inverted);
  drawLeftEdge(display, visibleH, inverted);

  const textBlockH = 2 * FONT_LINE_HEIGHT;
  const textTop =
    contentPadding(height) +
    Math.floor((contentAreaHeight(height) - textBlockH) / 2);

  display.drawText({
    x: Math.floor(width / 2),
    y: textTop,
    text: "Pixel-Check",
    font: testFont,
    color: 1,
    horizontal_align: "center",
    vertical_align: "top",
  });

  display.drawText({
    x: Math.floor(width / 2),
    y: textTop + FONT_LINE_HEIGHT,
    text: String(countdown),
    font: testFont,
    color: 1,
    horizontal_align: "center",
    vertical_align: "top",
  });

  return display.get();
}

function packFrame(
  raw: number[],
  width: number,
  height: number,
): number[] {
  const length = bitmapBytes(width, height);
  const bitmap = new Array(length).fill(0);
  for (let i = 0; i < Math.min(raw.length, length); i++) {
    bitmap[i] = raw[i]!;
  }
  return bitmap;
}

/** Feature-Test Phase 1: Ränder + Countdown, invertiert pro Sekunde. */
export function buildPixelCheckFrame(
  inverted: boolean,
  countdown: number,
): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of OLED_SCREENS) {
    const raw = renderPixelCheckBitmap(
      screen.width,
      screen.height,
      inverted,
      countdown,
    );
    frame[screen.key] = packFrame(raw, screen.width, screen.height);
  }

  return frame;
}
