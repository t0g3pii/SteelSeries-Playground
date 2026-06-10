import type { ScreenHandler } from "../gamesense/client.js";

/** GameSense-Textmodus: max. Zeichen pro Zeile */
export const OLED_TEXT_LINE_MAX = 17;

/** 6×8-Font auf 128px Breite */
export const OLED_BITMAP_LINE_MAX = 21;

export function formatOledLine(
  label: string,
  shortLabel: string,
  ip: string,
  maxLength = OLED_TEXT_LINE_MAX,
): string {
  for (const prefix of [label, shortLabel, ""]) {
    const line = `${prefix} ${ip}`;
    if (line.length <= maxLength) {
      return line;
    }
  }
  return ip.slice(0, maxLength - 1) + "…";
}

/** Bitmap: volle Labels (LAN:/WAN:), IP bei Bedarf kürzen */
export function formatBitmapLine(label: string, ip: string): string {
  const line = `${label}${ip}`;
  if (line.length <= OLED_BITMAP_LINE_MAX) {
    return line;
  }
  const ipBudget = OLED_BITMAP_LINE_MAX - label.length;
  if (ipBudget <= 1) {
    return ip.slice(0, OLED_BITMAP_LINE_MAX - 1) + "…";
  }
  return `${label}${ip.slice(0, ipBudget - 1)}…`;
}

export function getTextScreenHandlers(): ScreenHandler[] {
  return [
    {
      "device-type": "screened",
      mode: "screen",
      zone: "one",
      datas: [
        {
          lines: [
            { "has-text": true, "context-frame-key": "lan" },
            { "has-text": true, "context-frame-key": "wan" },
          ],
        },
      ],
    },
  ];
}

export function buildTextFrame(
  lan: string,
  wan: string,
): Record<string, string> {
  return {
    lan: formatOledLine("LAN:", "L:", lan),
    wan: formatOledLine("WAN:", "W:", wan),
  };
}
