import { Display } from "./display.js";
import { contentAreaHeight, contentPadding } from "./deadzone.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

export const MARQUEE_TEXT =
  "SteelSeries GameDAC  |  LAN 192.168.0.42  |  Playground  ";

/** Pixel-Schritt pro Frame — langsamer = weniger Tearing auf dem GameDAC. */
export const MARQUEE_PIXELS_PER_STEP = 1;

export function buildMarqueeFrame(pixelOffset: number): Record<string, number[]> {
  const loop = MARQUEE_TEXT + MARQUEE_TEXT;
  const loopWidthPx = MARQUEE_TEXT.length * font.width;
  const offset =
    ((Math.round(pixelOffset) % loopWidthPx) + loopWidthPx) % loopWidthPx;

  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const y =
      contentPadding(height) +
      Math.floor((contentAreaHeight(height) - font.height) / 2);
    const charsNeeded = Math.ceil((width + offset) / font.width) + 1;
    const slice = loop.slice(0, charsNeeded);

    display.drawText({
      x: -offset,
      y,
      text: slice,
      font,
      color: 1,
      vertical_align: "top",
    });

    return display.get();
  });
}
