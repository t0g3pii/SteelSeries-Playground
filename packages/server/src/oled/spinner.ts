import { Display } from "./display.js";
import { contentAreaHeight, contentPadding } from "./deadzone.js";
import { fillRect } from "./draw-helpers.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

export const SPINNER_RADIUS_PX = 7;

const SPINNER_POSITIONS = 8;

/** Nachlaufende Punkte hinter dem Kopf (1-bit: kleiner = schwächer wirkend). */
const SPINNER_TRAIL_LENGTH = 6;

const TRAIL_SIZES = [4, 3, 2, 2, 1, 1] as const;

function spinnerOffsets(radius: number): ReadonlyArray<{ x: number; y: number }> {
  return Array.from({ length: SPINNER_POSITIONS }, (_, i) => {
    const angle = ((Math.PI * 2) / SPINNER_POSITIONS) * i - Math.PI / 2;
    return {
      x: Math.round(radius * Math.cos(angle)),
      y: Math.round(radius * Math.sin(angle)),
    };
  });
}

const SPINNER_OFFSETS = spinnerOffsets(SPINNER_RADIUS_PX);

function drawSpinnerDot(
  display: Display,
  x: number,
  y: number,
  size: number,
): void {
  if (size <= 1) {
    display.drawPixel(x, y, 1);
    return;
  }

  const half = Math.floor(size / 2);
  fillRect(display, x - half, y - half, size, size, 1);
}

export function buildSpinnerFrame(frameIndex: number): Record<string, number[]> {
  const idx =
    ((Math.round(frameIndex) % SPINNER_OFFSETS.length) +
      SPINNER_OFFSETS.length) %
    SPINNER_OFFSETS.length;

  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const titleY = contentPadding(height);
    const cx = Math.floor(width / 2);
    const cy =
      contentPadding(height) +
      Math.floor(contentAreaHeight(height) / 2) +
      4;

    display.drawText({
      x: cx,
      y: titleY,
      text: "Load",
      font,
      color: 1,
      horizontal_align: "center",
      vertical_align: "top",
    });

    display.drawPixel(cx, cy, 1);

    for (let trail = SPINNER_TRAIL_LENGTH - 1; trail >= 0; trail--) {
      const posIdx =
        (idx - trail + SPINNER_POSITIONS * SPINNER_TRAIL_LENGTH) %
        SPINNER_POSITIONS;
      const offset = SPINNER_OFFSETS[posIdx]!;
      const size = TRAIL_SIZES[trail] ?? 1;
      drawSpinnerDot(display, cx + offset.x, cy + offset.y, size);
    }

    return display.get();
  });
}
