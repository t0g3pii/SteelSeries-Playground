import type { Display } from "./display.js";
import type { OledFont } from "./oled-font.js";

const MARQUEE_GAP = "   ";

export function textWidthPx(text: string, font: OledFont): number {
  return text.length * font.width;
}

export function textFitsInWidth(
  text: string,
  maxWidthPx: number,
  font: OledFont,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return textWidthPx(trimmed, font) <= maxWidthPx;
}

function drawTextClipped(
  display: Display,
  text: string,
  x: number,
  y: number,
  font: OledFont,
  clipLeft: number,
  clipRight: number,
): void {
  for (let i = 0; i < text.length; i++) {
    const charX = x + i * font.width;
    if (charX >= clipRight) break;
    if (charX + font.width <= clipLeft) continue;

    const charData = font.get(text[i] ?? " ");
    for (let row = 0; row < charData.length; row++) {
      for (let col = 0; col < charData[row].length; col++) {
        if (charData[row][col] !== 1) continue;
        const px = charX + col;
        const py = y + row;
        if (px < clipLeft || px >= clipRight) continue;
        display.drawPixel(px, py, 1);
      }
    }
  }
}

/**
 * Statische Zeile oder Marquee; Text wird auf [x, x + maxWidthPx) geclippt.
 */
export function drawMarqueeLine(
  display: Display,
  text: string,
  x: number,
  y: number,
  maxWidthPx: number,
  font: OledFont,
  scrollTick: number,
  pixelsPerStep = 1,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const clipRight = x + maxWidthPx;

  if (textFitsInWidth(trimmed, maxWidthPx, font)) {
    drawTextClipped(display, trimmed, x, y, font, x, clipRight);
    return;
  }

  const loop = trimmed + MARQUEE_GAP;
  const loopWidthPx = textWidthPx(loop, font);
  const offset =
    (Math.round(scrollTick) * pixelsPerStep) % Math.max(loopWidthPx, 1);
  const doubled = loop + loop;
  const charsNeeded = Math.ceil((maxWidthPx + offset) / font.width) + 1;

  drawTextClipped(
    display,
    doubled.slice(0, charsNeeded),
    x - offset,
    y,
    font,
    x,
    clipRight,
  );
}
