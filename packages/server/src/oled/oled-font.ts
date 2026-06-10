import { createRequire } from "node:module";
import type { Pixel } from "./types.js";

const require = createRequire(import.meta.url);

interface OledFontPackFont {
  width: number;
  height: number;
  fontData: number[];
}

const emptyGlyph = (width: number, height: number): Pixel[][] =>
  Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as Pixel),
  );

function decodeGlyph(
  font: OledFontPackFont,
  charCode: number,
): Pixel[][] {
  const glyphIndex = charCode - 32;
  if (glyphIndex < 0) {
    return emptyGlyph(font.width, font.height);
  }

  const bytesPerChar = font.width;
  const start = glyphIndex * bytesPerChar;
  if (start + bytesPerChar > font.fontData.length) {
    return emptyGlyph(font.width, font.height);
  }

  const glyph = emptyGlyph(font.width, font.height);

  for (let col = 0; col < font.width; col++) {
    const byte = font.fontData[start + col] ?? 0;
    for (let row = 0; row < font.height; row++) {
      glyph[row][col] = ((byte >> row) & 1) as Pixel;
    }
  }

  return glyph;
}

export class OledFont {
  readonly width: number;
  readonly height: number;
  private readonly source: OledFontPackFont;

  private constructor(source: OledFontPackFont) {
    this.source = source;
    this.width = source.width;
    this.height = source.height;
  }

  static loadSmall6x8(): OledFont {
    const font = require("oled-font-pack/fonts/6x8/small-font-6x8") as OledFontPackFont;
    return new OledFont(font);
  }

  get(char: string): Pixel[][] {
    return decodeGlyph(this.source, char.charCodeAt(0));
  }
}
