import type { OledFont } from "./oled-font.js";

export type PixelColor = -1 | 0 | 1;
export type Pixel = 0 | 1;

export interface TextOptions {
  x: number;
  y: number;
  text: string;
  font: OledFont;
  color?: PixelColor;
  background?: PixelColor;
  vertical_align?: "top" | "middle" | "bottom";
  horizontal_align?: "left" | "center" | "right";
}
