import { bitmapBytes, OLED_SCREENS } from "./deadzone.js";

export function packBitmap(
  raw: number[],
  width: number,
  height: number,
): number[] {
  const length = bitmapBytes(width, height);
  const bitmap = new Array(length).fill(0);
  for (let i = 0; i < Math.min(raw.length, length); i++) {
    bitmap[i] = raw[i]!;
  }
  return bitmap;
}

export function buildBitmapFrame(
  render: (width: number, height: number) => number[],
): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of OLED_SCREENS) {
    const raw = render(screen.width, screen.height);
    frame[screen.key] = packBitmap(raw, screen.width, screen.height);
  }

  return frame;
}
