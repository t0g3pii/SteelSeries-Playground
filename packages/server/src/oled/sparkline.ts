import { Display } from "./display.js";
import { contentPadding, deviceVisibleHeight } from "./deadzone.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

export function buildSparklineFrame(samples: readonly number[]): Record<string, number[]> {
  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const visibleH = deviceVisibleHeight(height);
    const titleY = contentPadding(height);
    const chartTop = titleY + font.height + 4;
    const chartBottom = visibleH - contentPadding(height) - 2;
    const chartH = chartBottom - chartTop;
    const chartLeft = 4;
    const chartRight = width - 5;
    const chartW = chartRight - chartLeft;

    display.drawText({
      x: Math.floor(width / 2),
      y: titleY,
      text: "Spark",
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    for (let x = chartLeft; x <= chartRight; x++) {
      display.drawPixel(x, chartBottom, 1);
    }

    const count = samples.length;
    if (count < 2) return display.get();

    for (let i = 0; i < count; i++) {
      const value = Math.max(0, Math.min(1, samples[i] ?? 0));
      const x =
        chartLeft + Math.round((i / Math.max(count - 1, 1)) * chartW);
      const y = chartBottom - Math.round(value * chartH);
      display.drawPixel(x, y, 1);

      if (i > 0) {
        const prevValue = Math.max(0, Math.min(1, samples[i - 1] ?? 0));
        const x0 =
          chartLeft + Math.round(((i - 1) / Math.max(count - 1, 1)) * chartW);
        const y0 = chartBottom - Math.round(prevValue * chartH);
        drawLine(display, x0, y0, x, y);
      }
    }

    const last = samples[count - 1] ?? 0;
    display.drawText({
      x: chartRight,
      y: chartTop,
      text: `${Math.round(last * 100)}`,
      font,
      color: 1,
      horizontal_align: "right",
      vertical_align: "top",
    });

    return display.get();
  });
}

function drawLine(
  display: Display,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    display.drawPixel(x, y, 1);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
