import { Display } from "./display.js";
import { contentAreaHeight, contentPadding } from "./deadzone.js";
import { drawBitmapIcon } from "./draw-helpers.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { OledFont } from "./oled-font.js";

const font = OledFont.loadSmall6x8();

export type StatusTileVariant = "mic-on" | "gg-ok" | "bt" | "warn";

const ICON_MIC = [
  "00111100",
  "01111110",
  "01111110",
  "01111110",
  "00111100",
  "00011000",
  "00011000",
  "00011000",
] as const;

const ICON_WIFI = [
  "00011000",
  "00111100",
  "01111110",
  "11111111",
  "00011000",
  "00011000",
  "00011000",
  "00000000",
] as const;

const ICON_BT = [
  "00011000",
  "00011010",
  "00010100",
  "00011000",
  "00010100",
  "00011010",
  "00011000",
  "00000000",
] as const;

const ICON_WARN = [
  "00011000",
  "00111100",
  "01111110",
  "01111110",
  "01111110",
  "00111100",
  "00011000",
  "00000000",
] as const;

const TILES: Record<
  StatusTileVariant,
  { icon: readonly string[]; line1: string; line2: string }
> = {
  "mic-on": { icon: ICON_MIC, line1: "Mic", line2: "An" },
  "gg-ok": { icon: ICON_WIFI, line1: "GG", line2: "Verbunden" },
  bt: { icon: ICON_BT, line1: "Bluetooth", line2: "Gekoppelt" },
  warn: { icon: ICON_WARN, line1: "Hinweis", line2: "Ping hoch" },
};

export function buildStatusTileFrame(
  variant: StatusTileVariant,
): Record<string, number[]> {
  const tile = TILES[variant];

  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    display.clear();

    const blockH = 8 + font.height * 2;
    const top =
      contentPadding(height) +
      Math.floor((contentAreaHeight(height) - blockH) / 2);
    const iconX = Math.floor(width / 2) - 20;
    const textX = iconX + 12;

    drawBitmapIcon(display, iconX, top, tile.icon);
    display.drawText({
      x: textX,
      y: top,
      text: tile.line1,
      font,
      color: 1,
      vertical_align: "top",
    });
    display.drawText({
      x: textX,
      y: top + font.height,
      text: tile.line2,
      font,
      color: 1,
      vertical_align: "top",
    });

    return display.get();
  });
}

export const STATUS_TILE_VARIANTS: StatusTileVariant[] = [
  "mic-on",
  "gg-ok",
  "bt",
  "warn",
];
