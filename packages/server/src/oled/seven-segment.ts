import { Display } from "./display.js";
import { contentAreaHeight, contentPadding } from "./deadzone.js";
import { fillRect } from "./draw-helpers.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

const SEG_A = 1;
const SEG_B = 2;
const SEG_C = 4;
const SEG_D = 8;
const SEG_E = 16;
const SEG_F = 32;
const SEG_G = 64;

const DIGIT_MASK: Record<number, number> = {
  0: SEG_A | SEG_B | SEG_C | SEG_D | SEG_E | SEG_F,
  1: SEG_B | SEG_C,
  2: SEG_A | SEG_B | SEG_G | SEG_E | SEG_D,
  3: SEG_A | SEG_B | SEG_C | SEG_D | SEG_G,
  4: SEG_F | SEG_G | SEG_B | SEG_C,
  5: SEG_A | SEG_F | SEG_G | SEG_C | SEG_D,
  6: SEG_A | SEG_F | SEG_G | SEG_E | SEG_C | SEG_D,
  7: SEG_A | SEG_B | SEG_C,
  8: SEG_A | SEG_B | SEG_C | SEG_D | SEG_E | SEG_F | SEG_G,
  9: SEG_A | SEG_B | SEG_C | SEG_D | SEG_F | SEG_G,
};

const DIGIT_W = 12;
const DIGIT_H = 18;
const DIGIT_GAP = 4;

function drawDigit(display: Display, x: number, y: number, digit: number): void {
  const mask = DIGIT_MASK[digit] ?? 0;
  const t = 2;

  if (mask & SEG_A) fillRect(display, x + t, y, DIGIT_W - t * 2, t, 1);
  if (mask & SEG_B) fillRect(display, x + DIGIT_W - t, y + t, t, 7, 1);
  if (mask & SEG_C) {
    fillRect(display, x + DIGIT_W - t, y + 10, t, 7, 1);
  }
  if (mask & SEG_D) {
    fillRect(display, x + t, y + DIGIT_H - t, DIGIT_W - t * 2, t, 1);
  }
  if (mask & SEG_E) fillRect(display, x, y + 10, t, 7, 1);
  if (mask & SEG_F) fillRect(display, x, y + t, t, 7, 1);
  if (mask & SEG_G) fillRect(display, x + t, y + 8, DIGIT_W - t * 2, t, 1);
}

export function buildSevenSegmentFrame(value: number): Record<string, number[]> {
  const clamped = Math.max(0, Math.min(999, Math.round(value)));
  const text = String(clamped).padStart(3, "0");
  const digits = text.split("").map((c) => Number(c));

  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const titleY = contentPadding(height);
    const totalW = digits.length * DIGIT_W + (digits.length - 1) * DIGIT_GAP;
    const startX = Math.floor((width - totalW) / 2);
    const digitY =
      contentPadding(height) +
      Math.floor((contentAreaHeight(height) - DIGIT_H) / 2) +
      4;

    display.drawText({
      x: Math.floor(width / 2),
      y: titleY,
      text: "7-Seg",
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    for (let i = 0; i < digits.length; i++) {
      drawDigit(
        display,
        startX + i * (DIGIT_W + DIGIT_GAP),
        digitY,
        digits[i] ?? 0,
      );
    }

    return display.get();
  });
}
