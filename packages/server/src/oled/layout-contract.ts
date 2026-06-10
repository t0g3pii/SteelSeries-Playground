/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OLED LAYOUT CONTRACT — Arctis Nova Pro Wireless GameDAC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Empirisch verifiziert (Pixel-Checker mit 4s-Invertierung, Zeilen-Test,
 * Deadzone-Ecken). Nicht ändern ohne erneute Hardware-Messung.
 *
 * Regeln:
 * 1. GameSense erhält immer ein 128×64-Bitmap (`image-data-128x64`).
 * 2. Physisch sichtbar sind nur 128×52 Pixel (X: 0–127, Y: 0–51).
 * 3. Text/Layout nur innerhalb der sichtbaren Fläche; 2px Luft oben/unten.
 * 4. Max. 6 Textzeilen à 8px (6×8-Font).
 * 5. Web-Geräteansicht = 128×52 (Y≥52 wird nicht angezeigt).
 *
 * @see packages/server/src/oled/deadzone.ts — Layout-Helfer
 * @see README.md — Abschnitt „OLED Layout Contract“
 */
export const OLED_LAYOUT_CONTRACT = {
  bitmap: {
    width: 128,
    height: 64,
    gameSenseKey: "image-data-128x64",
  },
  visible: {
    width: 128,
    height: 52,
    /** Letzte sichtbare Y-Zeile (0-basiert). */
    maxY: 51,
    /** Erste nicht sichtbare Y-Zeile — Preview-Maske & Clipping ab hier. */
    clipBelowY: 52,
  },
  content: {
    /** Luft oben und unten innerhalb der sichtbaren Fläche. */
    paddingPx: 2,
    /** (52 − 2×2) / 8 */
    maxTextLines: 6,
    lineHeightPx: 8,
  },
  legacy: {
    /** Älteres GameDAC; GameSense-Key für Abwärtskompatibilität. */
    gameSenseKey: "image-data-128x52",
    height: 52,
  },
} as const;

export type OledLayoutContract = typeof OLED_LAYOUT_CONTRACT;
