import jpeg from "jpeg-js";
import type { Display } from "./display.js";

/** Graustufen → 1-bit (Schwellwert). */
export function rgbaToMonochrome(
  rgba: Uint8Array,
  width: number,
  height: number,
  threshold = 128,
): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i] ?? 0;
      const g = rgba[i + 1] ?? 0;
      const b = rgba[i + 2] ?? 0;
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      out[y * width + x] = luminance >= threshold ? 1 : 0;
    }
  }
  return out;
}

/** Nearest-Neighbor auf Zielgröße, Ausgabe 0/1 pro Pixel. */
export function resizeMonochrome(
  pixels: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const out = new Uint8Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x / dstW) * srcW));
      const sy = Math.min(srcH - 1, Math.floor((y / dstH) * srcH));
      out[y * dstW + x] = pixels[sy * srcW + sx] ?? 0;
    }
  }
  return out;
}

export function decodeImageToMonochrome(
  bytes: Buffer,
  width: number,
  height: number,
): Uint8Array | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    try {
      const decoded = jpeg.decode(bytes, { useTArray: true });
      const mono = rgbaToMonochrome(
        decoded.data,
        decoded.width,
        decoded.height,
      );
      return resizeMonochrome(mono, decoded.width, decoded.height, width, height);
    } catch {
      return null;
    }
  }
  return null;
}

export function drawMonochromeBitmap(
  display: Display,
  x: number,
  y: number,
  pixels: Uint8Array,
  width: number,
  height: number,
): void {
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (pixels[py * width + px]) {
        display.drawPixel(x + px, y + py, 1);
      }
    }
  }
}
