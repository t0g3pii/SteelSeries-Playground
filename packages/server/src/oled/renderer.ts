import { Display } from "./display.js";
import type { ScreenHandler } from "../gamesense/client.js";
import {
  IMAGE_DATA_KEY,
  bitmapBytes,
  contentCenterY,
  contentLine1Top,
  contentLine2Top,
} from "./deadzone.js";

export { bitmapBytes };
import { OledFont } from "./oled-font.js";
import { formatBitmapLine } from "./text-handler.js";

interface ScreenSpec {
  key: string;
  deviceType: string;
  width: number;
  height: number;
}

/**
 * Nova Pro / GameDAC Gen2: 128×64 (primär).
 * Legacy Arctis Pro + GameDAC: 128×52.
 */
const BITMAP_SCREENS: ScreenSpec[] = [
  {
    key: "image-data-128x64",
    deviceType: "screened-128x64",
    width: 128,
    height: 64,
  },
  {
    key: "image-data-128x52",
    deviceType: "screened-128x52",
    width: 128,
    height: 52,
  },
];

export { IMAGE_DATA_KEY };

const font = OledFont.loadSmall6x8();

function padBitmap(data: number[], length: number): number[] {
  const bitmap = new Array(length).fill(0);
  for (let i = 0; i < Math.min(data.length, length); i++) {
    bitmap[i] = data[i]!;
  }
  return bitmap;
}

function renderIpBitmapForScreen(
  width: number,
  height: number,
  lan: string,
  wan: string,
): number[] {
  const display = new Display(width, height);
  display.clear();

  display.drawText({
    x: 0,
    y: contentLine1Top(height),
    text: formatBitmapLine("LAN: ", lan),
    font,
    color: 1,
    vertical_align: "top",
  });

  display.drawText({
    x: 0,
    y: contentLine2Top(height),
    text: formatBitmapLine("WAN: ", wan),
    font,
    color: 1,
    vertical_align: "top",
  });

  return display.get();
}

function renderOfflineBitmap(width: number, height: number): number[] {
  const display = new Display(width, height);
  display.clear();

  display.drawText({
    x: Math.floor(width / 2),
    y: contentCenterY(height),
    text: "Offline",
    font,
    color: 1,
    horizontal_align: "center",
    vertical_align: "middle",
  });

  return display.get();
}

export function buildOfflineFrame(): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of BITMAP_SCREENS) {
    const raw = renderOfflineBitmap(screen.width, screen.height);
    frame[screen.key] = padBitmap(
      raw,
      bitmapBytes(screen.width, screen.height),
    );
  }

  return frame;
}

export function buildImageFrame(
  lan: string,
  wan: string,
): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of BITMAP_SCREENS) {
    const raw = renderIpBitmapForScreen(screen.width, screen.height, lan, wan);
    frame[screen.key] = padBitmap(
      raw,
      bitmapBytes(screen.width, screen.height),
    );
  }

  return frame;
}

export function getBitmapScreenHandlers(): ScreenHandler[] {
  return BITMAP_SCREENS.map((screen) => ({
    "device-type": screen.deviceType,
    mode: "screen",
    zone: "one",
    datas: [
      {
        "has-text": false,
        "image-data": new Array(bitmapBytes(screen.width, screen.height)).fill(
          0,
        ),
      },
    ],
  }));
}
