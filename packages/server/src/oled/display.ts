/**
 * Display bitmap logic adapted from steelseries-screen-controller
 * https://github.com/Aidan647/SteelSeries-Screen-Controller (CC BY-NC-SA 4.0)
 */
import { sanitizeOledText } from "./text-sanitize.js";
import type { Pixel, PixelColor, TextOptions } from "./types.js";

export class Display {
  private readonly display: Pixel[][];

  constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    this.display = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 0 as Pixel),
    );
  }

  drawPixel(x: number, y: number, color: PixelColor = 1): this {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return this;
    }

    if (color === -1) {
      this.display[y][x] = this.display[y][x] === 1 ? 0 : 1;
      return this;
    }

    this.display[y][x] = color;
    return this;
  }

  clear(): this {
    return this.fill(0);
  }

  fill(color: PixelColor = 1): this {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.drawPixel(x, y, color);
      }
    }
    return this;
  }

  drawText(options: TextOptions): this {
    const { x, y, font, color, background } = options;
    const text = sanitizeOledText(options.text);
    const verticalAlign = options.vertical_align ?? "top";
    const horizontalAlign = options.horizontal_align ?? "left";

    const textWidth = text.length * font.width;
    const textHeight = font.height;
    const textX =
      horizontalAlign === "center"
        ? x - textWidth / 2
        : horizontalAlign === "right"
          ? x - textWidth
          : x;
    const textY =
      verticalAlign === "middle"
        ? y - textHeight / 2
        : verticalAlign === "bottom"
          ? y - textHeight
          : y;

    for (let i = 0; i < text.length; i++) {
      const charData = font.get(text[i] ?? " ");
      const charX = textX + i * font.width;
      const charY = textY;

      for (let row = 0; row < charData.length; row++) {
        for (let col = 0; col < charData[row].length; col++) {
          const pixel = charData[row][col];
          const px = charX + col;
          const py = charY + row;

          if (pixel === 1 && color !== undefined) {
            this.drawPixel(px, py, color);
          } else if (pixel === 0 && background !== undefined) {
            this.drawPixel(px, py, background);
          }
        }
      }
    }

    return this;
  }

  get(): number[] {
    const flattened = this.display.flat();
    const displayData: number[] = [];

    for (let i = 0; i < flattened.length; i += 8) {
      let result = 0;
      const byte = flattened.slice(i, i + 8);
      for (let j = 0; j < byte.length; j++) {
        if (byte[j] === 1) {
          result += 2 ** (7 - j);
        }
      }
      displayData.push(result);
    }

    return displayData;
  }
}
