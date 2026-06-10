import type { Display } from "./display.js";

export function fillRect(
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

export function drawBitmapIcon(
  display: Display,
  x: number,
  y: number,
  rows: readonly string[],
  color: 0 | 1 = 1,
): void {
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row] ?? "";
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "1") {
        display.drawPixel(x + col, y + row, color);
      }
    }
  }
}
