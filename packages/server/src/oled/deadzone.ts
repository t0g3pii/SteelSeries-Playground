import { Display } from "./display.js";
import { OLED_LAYOUT_CONTRACT } from "./layout-contract.js";
import { OledFont } from "./oled-font.js";

export { OLED_LAYOUT_CONTRACT } from "./layout-contract.js";

/** Bitmap-Größe laut GameSense: ⌈width × height / 8⌉ */
export function bitmapBytes(width: number, height: number): number {
  return Math.ceil((width * height) / 8);
}

const L = OLED_LAYOUT_CONTRACT;

export const OLED_WIDTH = L.bitmap.width;

export const OLED_SCREENS = [
  {
    key: L.bitmap.gameSenseKey,
    width: L.bitmap.width,
    height: L.bitmap.height,
  },
  {
    key: L.legacy.gameSenseKey,
    width: L.bitmap.width,
    height: L.legacy.height,
  },
] as const;

export const IMAGE_DATA_KEY = OLED_SCREENS[0].key;

/** 6×8-Font — muss zu `L.content.lineHeightPx` passen. */
export const FONT_LINE_HEIGHT = OledFont.loadSmall6x8().height;

/** Gesendetes GameSense-Bitmap (Nova Pro). */
export const BITMAP_HEIGHT_64 = L.bitmap.height;

/** Sichtbare Höhe auf dem physischen Display. */
export const DEVICE_VISIBLE_HEIGHT_64 = L.visible.height;

/** Luft oben/unten innerhalb der sichtbaren Fläche. */
export const CONTENT_PADDING_64 = L.content.paddingPx;

export interface DrawableBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DeadzoneInfo {
  /** Effektiv nutzbare Fläche auf dem GameDAC. */
  drawable: DrawableBounds;
  /** Gesendetes Bitmap an GameSense. */
  screen: { width: number; height: number };
  margins: { top: number; bottom: number; left: number; right: number };
  lineHeight: number;
  maxTextLines: number;
  deviceVisibleTextLines: number;
  screens: Array<{ key: string; width: number; height: number }>;
}

/** Sichtbare Höhe auf dem physischen Display. */
export function deviceVisibleHeight(screenHeight: number): number {
  if (screenHeight >= BITMAP_HEIGHT_64) return DEVICE_VISIBLE_HEIGHT_64;
  return screenHeight;
}

/** Ab dieser Y-Zeile ist auf dem GameDAC nichts mehr sichtbar (Geräteansicht). */
export function devicePreviewMaskBelowY(screenHeight: number): number {
  return deviceVisibleHeight(screenHeight);
}

export function getDrawableBounds(screenHeight: number): DrawableBounds {
  return {
    top: 0,
    left: 0,
    width: OLED_WIDTH,
    height: deviceVisibleHeight(screenHeight),
  };
}

export function contentPadding(screenHeight: number): number {
  return Math.max(1, Math.round((CONTENT_PADDING_64 * screenHeight) / 64));
}

export function contentAreaHeight(screenHeight: number): number {
  const pad = contentPadding(screenHeight);
  return deviceVisibleHeight(screenHeight) - pad * 2;
}

export function maxTextLines(
  screenHeight: number,
  lineHeight = FONT_LINE_HEIGHT,
): number {
  return Math.floor(contentAreaHeight(screenHeight) / lineHeight);
}

export function deviceVisibleTextLines(screenHeight: number): number {
  return maxTextLines(screenHeight);
}

export function lineTopOffset(
  lineIndex: number,
  screenHeight: number,
  lineHeight = FONT_LINE_HEIGHT,
): number {
  return contentPadding(screenHeight) + lineIndex * lineHeight;
}

export function contentCenterY(screenHeight: number): number {
  const pad = contentPadding(screenHeight);
  return pad + contentAreaHeight(screenHeight) / 2;
}

export function getDeadzoneInfo(screenHeight: number): DeadzoneInfo {
  const pad = contentPadding(screenHeight);
  const lines = maxTextLines(screenHeight);
  return {
    drawable: getDrawableBounds(screenHeight),
    screen: { width: OLED_WIDTH, height: screenHeight },
    margins: { top: pad, left: 0, right: 0, bottom: pad },
    lineHeight: FONT_LINE_HEIGHT,
    maxTextLines: lines,
    deviceVisibleTextLines: lines,
    screens: OLED_SCREENS.map((s) => ({
      key: s.key,
      width: s.width,
      height: s.height,
    })),
  };
}

const CORNER_ARM = 6;
const testFont = OledFont.loadSmall6x8();

function drawCornerBrackets(
  display: Display,
  left: number,
  top: number,
  right: number,
  bottom: number,
): void {
  const arm = CORNER_ARM;

  for (let i = 0; i < arm; i++) {
    display.drawPixel(left + i, top, 1);
    display.drawPixel(left, top + i, 1);

    display.drawPixel(right - i, top, 1);
    display.drawPixel(right, top + i, 1);

    display.drawPixel(left + i, bottom, 1);
    display.drawPixel(left, bottom - i, 1);

    display.drawPixel(right - i, bottom, 1);
    display.drawPixel(right, bottom - i, 1);
  }
}

function renderDeadzoneTestBitmap(width: number, height: number): number[] {
  const display = new Display(width, height);
  display.clear();

  const visibleBottom = deviceVisibleHeight(height) - 1;

  drawCornerBrackets(display, 0, 0, width - 1, visibleBottom);

  const visibleH = deviceVisibleHeight(height);
  const sizeLabel = `${width}x${visibleH}`;
  const textBlockH = 2 * FONT_LINE_HEIGHT;
  const textTop =
    contentPadding(height) +
    Math.floor((contentAreaHeight(height) - textBlockH) / 2);

  display.drawText({
    x: Math.floor(width / 2),
    y: textTop,
    text: "Deadzone-Test",
    font: testFont,
    color: 1,
    horizontal_align: "center",
    vertical_align: "top",
  });

  display.drawText({
    x: Math.floor(width / 2),
    y: textTop + FONT_LINE_HEIGHT,
    text: sizeLabel,
    font: testFont,
    color: 1,
    horizontal_align: "center",
    vertical_align: "top",
  });

  return display.get();
}

export function buildDeadzoneTestFrame(): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of OLED_SCREENS) {
    const raw = renderDeadzoneTestBitmap(screen.width, screen.height);
    const length = bitmapBytes(screen.width, screen.height);
    const bitmap = new Array(length).fill(0);
    for (let i = 0; i < Math.min(raw.length, length); i++) {
      bitmap[i] = raw[i]!;
    }
    frame[screen.key] = bitmap;
  }

  return frame;
}

/** Zwei IP-Zeilen mittig im sichtbaren Content-Bereich. */
export function contentLine1Top(screenHeight: number): number {
  const lines = 2;
  const block = lines * FONT_LINE_HEIGHT;
  const pad = contentPadding(screenHeight);
  const area = contentAreaHeight(screenHeight);
  return pad + Math.floor((area - block) / 2);
}

export function contentLine2Top(screenHeight: number): number {
  return contentLine1Top(screenHeight) + FONT_LINE_HEIGHT;
}
