import { Display } from "./display.js";
import { contentPadding, deviceVisibleHeight } from "./deadzone.js";
import { fillRect } from "./draw-helpers.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

export const VOLUME_SEGMENT_COUNT = 12;

const SEG_W = 6;
const SEG_GAP = 2;
const SEG_H = 28;

export function buildVolumeBarsFrame(level: number): Record<string, number[]> {
  const clamped = Math.max(0, Math.min(VOLUME_SEGMENT_COUNT, Math.round(level)));

  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const visibleH = deviceVisibleHeight(height);
    const titleY = contentPadding(height);
    const totalW =
      VOLUME_SEGMENT_COUNT * SEG_W + (VOLUME_SEGMENT_COUNT - 1) * SEG_GAP;
    const startX = Math.floor((width - totalW) / 2);
    const bottomY = visibleH - contentPadding(height) - 2;

    display.drawText({
      x: Math.floor(width / 2),
      y: titleY,
      text: "Volume",
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    for (let i = 0; i < VOLUME_SEGMENT_COUNT; i++) {
      const x = startX + i * (SEG_W + SEG_GAP);
      strokeRect(display, x, bottomY - SEG_H, SEG_W, SEG_H);

      if (i < clamped) {
        fillRect(display, x + 1, bottomY - SEG_H + 1, SEG_W - 2, SEG_H - 2, 1);
      }
    }

    display.drawText({
      x: Math.floor(width / 2),
      y: bottomY - SEG_H - 10,
      text: `${Math.round((clamped / VOLUME_SEGMENT_COUNT) * 100)}%`,
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    return display.get();
  });
}

function strokeRect(
  display: Display,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  fillRect(display, x, y, w, 1, 1);
  fillRect(display, x, y + h - 1, w, 1, 1);
  fillRect(display, x, y, 1, h, 1);
  fillRect(display, x + w - 1, y, 1, h, 1);
}
