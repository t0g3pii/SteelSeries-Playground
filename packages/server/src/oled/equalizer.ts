import { Display } from "./display.js";
import { contentPadding, deviceVisibleHeight } from "./deadzone.js";
import { fillRect } from "./draw-helpers.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

export const EQ_BAR_COUNT = 9;

const BAR_W = 8;
const BAR_GAP = 4;
const BAR_MAX_H = 26;

export function buildEqualizerFrame(
  barHeights: readonly number[],
): Record<string, number[]> {
  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const visibleH = deviceVisibleHeight(height);
    const titleY = contentPadding(height);
    const totalW = EQ_BAR_COUNT * BAR_W + (EQ_BAR_COUNT - 1) * BAR_GAP;
    const startX = Math.floor((width - totalW) / 2);
    const bottomY = visibleH - contentPadding(height) - 2;

    display.drawText({
      x: Math.floor(width / 2),
      y: titleY,
      text: "EQ",
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    for (let i = 0; i < EQ_BAR_COUNT; i++) {
      const level = Math.max(0, Math.min(100, Math.round(barHeights[i] ?? 0)));
      const h = Math.max(2, Math.round((level / 100) * BAR_MAX_H));
      const x = startX + i * (BAR_W + BAR_GAP);
      fillRect(display, x, bottomY - h, BAR_W, h, 1);
    }

    return display.get();
  });
}
