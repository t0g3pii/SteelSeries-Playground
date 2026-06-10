/** OLED „an“ — leicht bläulich wie GameDAC. */
const ON_R = 210;
const ON_G = 232;
const ON_B = 255;

export const OLED_ON = `rgb(${ON_R}, ${ON_G}, ${ON_B})`;
export const OLED_OFF = "#000000";

function writePixel(
  data: Uint8ClampedArray,
  index: number,
  on: boolean,
): void {
  data[index] = on ? ON_R : 0;
  data[index + 1] = on ? ON_G : 0;
  data[index + 2] = on ? ON_B : 0;
  data[index + 3] = 255;
}

export function decodeBitmapToImageData(
  bitmap: number[],
  width: number,
  height: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bitIndex = y * width + x;
      const byteIndex = bitIndex >> 3;
      const bitInByte = 7 - (bitIndex & 7);
      const on =
        byteIndex < bitmap.length &&
        ((bitmap[byteIndex]! >> bitInByte) & 1) === 1;

      writePixel(data, (y * width + x) * 4, on);
    }
  }

  return new ImageData(data, width, height);
}

export function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  on: boolean,
): void {
  if (x < 0 || y < 0 || x >= width) return;
  writePixel(data, (y * width + x) * 4, on);
}
