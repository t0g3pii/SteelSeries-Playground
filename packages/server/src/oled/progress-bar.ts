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

const font = OledFont.loadSmall6x8();

/** 1 Pixel Track-Breite = 1 Prozent (0–100). */
export const PROGRESS_BAR_TRACK_PX = 100;

export const PROGRESS_BAR_HEIGHT_PX = 6;

export const PROGRESS_BAR_BORDER_PX = 1;

export function clampProgressPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Gefüllte Breite innerhalb des Tracks in Pixeln. */
export function progressBarFillWidth(percent: number): number {
  const p = clampProgressPercent(percent);
  return Math.round((p / 100) * PROGRESS_BAR_TRACK_PX);
}

function fillRect(
  display: Display,
  x: number,
  y: number,
  w: number,
  h: number,
  color: 0 | 1,
): void {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      display.drawPixel(px, py, color);
    }
  }
}

function strokeRect(
  display: Display,
  x: number,
  y: number,
  w: number,
  h: number,
  color: 0 | 1,
): void {
  fillRect(display, x, y, w, 1, color);
  fillRect(display, x, y + h - 1, w, 1, color);
  fillRect(display, x, y, 1, h, color);
  fillRect(display, x + w - 1, y, 1, h, color);
}

function renderProgressBarBitmap(
  width: number,
  height: number,
  percent: number,
): number[] {
  const display = new Display(width, height);
  display.clear();

  const p = clampProgressPercent(percent);
  const fillW = progressBarFillWidth(p);

  const outerW = PROGRESS_BAR_TRACK_PX + PROGRESS_BAR_BORDER_PX * 2;
  const outerH = PROGRESS_BAR_HEIGHT_PX + PROGRESS_BAR_BORDER_PX * 2;

  const blockH =
    FONT_LINE_HEIGHT + 2 + outerH + 2 + FONT_LINE_HEIGHT;
  const blockTop =
    contentPadding(height) +
    Math.floor((contentAreaHeight(height) - blockH) / 2);

  const titleY = blockTop;
  const barY = titleY + FONT_LINE_HEIGHT + 2;
  const percentY = barY + outerH + 2;
  const barX = Math.floor((width - outerW) / 2);

  display.drawText({
    x: Math.floor(width / 2),
    y: titleY,
    text: "Progress",
    font,
    color: 1,
    horizontal_align: "center",
    vertical_align: "top",
  });

  strokeRect(display, barX, barY, outerW, outerH, 1);

  if (fillW > 0) {
    fillRect(
      display,
      barX + PROGRESS_BAR_BORDER_PX,
      barY + PROGRESS_BAR_BORDER_PX,
      fillW,
      PROGRESS_BAR_HEIGHT_PX,
      1,
    );
  }

  display.drawText({
    x: Math.floor(width / 2),
    y: percentY,
    text: `${p}%`,
    font,
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

/** Progressbar 0–100 % — Track 100px breit (1 px = 1 %). */
export function buildProgressBarFrame(
  percent: number,
): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of OLED_SCREENS) {
    const raw = renderProgressBarBitmap(
      screen.width,
      screen.height,
      percent,
    );
    frame[screen.key] = packFrame(raw, screen.width, screen.height);
  }

  return frame;
}

export const progressBarInfo = {
  trackPx: PROGRESS_BAR_TRACK_PX,
  heightPx: PROGRESS_BAR_HEIGHT_PX,
  visibleHeight: deviceVisibleHeight(64),
} as const;
