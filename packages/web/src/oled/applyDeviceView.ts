import { setPixel } from "./decodeBitmap";

/** Entfernt Bitmap-Inhalt unterhalb der empirischen GameDAC-Textgrenze. */
export function applyDeviceViewMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  maskBelowY: number | null | undefined,
): void {
  if (maskBelowY == null) return;

  for (let y = maskBelowY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(data, width, x, y, false);
    }
  }
}
