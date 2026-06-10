import { Display } from "./display.js";
import { contentAreaHeight, contentPadding } from "./deadzone.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

function formatClock(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function buildClockFrame(date = new Date()): Record<string, number[]> {
  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const titleY = contentPadding(height);
    const timeY =
      contentPadding(height) +
      Math.floor((contentAreaHeight(height) - font.height) / 2) +
      2;

    display.drawText({
      x: Math.floor(width / 2),
      y: titleY,
      text: "Clock",
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    display.drawText({
      x: Math.floor(width / 2),
      y: timeY,
      text: formatClock(date),
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    return display.get();
  });
}
