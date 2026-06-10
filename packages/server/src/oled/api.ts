/**
 * Öffentliche OLED-API — Frame-Builder, Layout-Helfer und Low-Level-Zeichnen.
 *
 * Für neue Display-Module und Features immer von hier importieren:
 *   import { buildGaugeFrame, clampProgressPercent } from "../oled/api.js";
 *
 * @see docs/OLED-API.md
 */

import type { DisplayFrame } from "../modules/types.js";
import { buildPixelCheckFrame } from "./checkerboard-test.js";
import { buildClockFrame } from "./clock.js";
import {
  BITMAP_HEIGHT_64,
  CONTENT_PADDING_64,
  DEVICE_VISIBLE_HEIGHT_64,
  FONT_LINE_HEIGHT,
  IMAGE_DATA_KEY,
  OLED_SCREENS,
  OLED_WIDTH,
  bitmapBytes,
  buildDeadzoneTestFrame,
  contentAreaHeight,
  contentCenterY,
  contentLine1Top,
  contentLine2Top,
  contentPadding,
  devicePreviewMaskBelowY,
  deviceVisibleHeight,
  deviceVisibleTextLines,
  getDeadzoneInfo,
  getDrawableBounds,
  lineTopOffset,
  maxTextLines,
} from "./deadzone.js";
import { Display } from "./display.js";
import { drawBitmapIcon, fillRect } from "./draw-helpers.js";
import { buildEqualizerFrame, EQ_BAR_COUNT } from "./equalizer.js";
import { buildBitmapFrame, packBitmap } from "./frame-pack.js";
import {
  GAUGE_ARC_SEGMENTS,
  GAUGE_ARC_START_RAD,
  GAUGE_ARC_SWEEP_RAD,
  GAUGE_INNER_RADIUS_PX,
  GAUGE_OUTER_RADIUS_PX,
  GAUGE_RING_THICKNESS_PX,
  buildGaugeFrame,
  gaugeInfo,
} from "./gauge.js";
import { buildLineTestFrame, lineTestInfo } from "./line-test.js";
import { buildMediaFrame, MEDIA_COVER_SIZE_PX } from "./media-frame.js";
import { OLED_LAYOUT_CONTRACT } from "./layout-contract.js";
import {
  MARQUEE_PIXELS_PER_STEP,
  MARQUEE_TEXT,
  buildMarqueeFrame,
} from "./marquee.js";
import { OledFont } from "./oled-font.js";
import {
  PROGRESS_BAR_BORDER_PX,
  PROGRESS_BAR_HEIGHT_PX,
  PROGRESS_BAR_TRACK_PX,
  buildProgressBarFrame,
  clampProgressPercent,
  progressBarFillWidth,
  progressBarInfo,
} from "./progress-bar.js";
import {
  buildImageFrame,
  buildOfflineFrame,
  getBitmapScreenHandlers,
} from "./renderer.js";
import { buildSevenSegmentFrame } from "./seven-segment.js";
import { buildSparklineFrame } from "./sparkline.js";
import { SPINNER_RADIUS_PX, buildSpinnerFrame } from "./spinner.js";
import {
  STATUS_TILE_VARIANTS,
  buildStatusTileFrame,
} from "./status-tile.js";
import {
  OLED_BITMAP_LINE_MAX,
  OLED_TEXT_LINE_MAX,
  buildTextFrame,
  formatBitmapLine,
  formatOledLine,
  getTextScreenHandlers,
} from "./text-handler.js";
import {
  VOLUME_SEGMENT_COUNT,
  buildVolumeBarsFrame,
} from "./volume-bars.js";

// ─── Typen ───────────────────────────────────────────────────────────────────

/** GameSense-Bitmap: Screen-Key → gepackte Pixel-Bytes. */
export type OledBitmapFrame = Record<string, number[]>;

export type { DisplayFrame };
export type { Pixel, PixelColor, TextOptions } from "./types.js";
export type { StatusTileVariant } from "./status-tile.js";
export type { DrawableBounds, DeadzoneInfo } from "./deadzone.js";
export type { OledLayoutContract } from "./layout-contract.js";

// ─── Re-Exports ──────────────────────────────────────────────────────────────

export {
  BITMAP_HEIGHT_64,
  CONTENT_PADDING_64,
  DEVICE_VISIBLE_HEIGHT_64,
  FONT_LINE_HEIGHT,
  IMAGE_DATA_KEY,
  OLED_LAYOUT_CONTRACT,
  OLED_SCREENS,
  OLED_WIDTH,
  bitmapBytes,
  buildClockFrame,
  buildDeadzoneTestFrame,
  buildEqualizerFrame,
  buildGaugeFrame,
  buildImageFrame,
  buildLineTestFrame,
  buildMediaFrame,
  buildMarqueeFrame,
  buildOfflineFrame,
  buildPixelCheckFrame,
  buildProgressBarFrame,
  buildSevenSegmentFrame,
  buildSparklineFrame,
  buildSpinnerFrame,
  buildStatusTileFrame,
  buildTextFrame,
  buildVolumeBarsFrame,
  clampProgressPercent,
  contentAreaHeight,
  contentCenterY,
  contentLine1Top,
  contentLine2Top,
  contentPadding,
  devicePreviewMaskBelowY,
  deviceVisibleHeight,
  deviceVisibleTextLines,
  drawBitmapIcon,
  EQ_BAR_COUNT,
  fillRect,
  formatBitmapLine,
  formatOledLine,
  GAUGE_ARC_SEGMENTS,
  GAUGE_ARC_START_RAD,
  GAUGE_ARC_SWEEP_RAD,
  GAUGE_INNER_RADIUS_PX,
  GAUGE_OUTER_RADIUS_PX,
  GAUGE_RING_THICKNESS_PX,
  gaugeInfo,
  getBitmapScreenHandlers,
  getDeadzoneInfo,
  getDrawableBounds,
  getTextScreenHandlers,
  lineTestInfo,
  lineTopOffset,
  MARQUEE_PIXELS_PER_STEP,
  MARQUEE_TEXT,
  MEDIA_COVER_SIZE_PX,
  maxTextLines,
  OLED_BITMAP_LINE_MAX,
  OLED_TEXT_LINE_MAX,
  progressBarFillWidth,
  progressBarInfo,
  PROGRESS_BAR_BORDER_PX,
  PROGRESS_BAR_HEIGHT_PX,
  PROGRESS_BAR_TRACK_PX,
  SPINNER_RADIUS_PX,
  STATUS_TILE_VARIANTS,
  VOLUME_SEGMENT_COUNT,
  buildBitmapFrame,
  Display,
  OledFont,
  packBitmap,
};

// ─── Komponenten-Metadaten (Discovery) ───────────────────────────────────────

export interface OledComponentMeta {
  id: string;
  label: string;
  /** Kurzbeschreibung der build()-Parameter. */
  params: string;
}

type OledComponentEntry<TBuild extends (...args: never[]) => OledBitmapFrame> =
  OledComponentMeta & { build: TBuild };

/** Alle wiederverwendbaren UI-Komponenten mit build-Funktion. */
export const OLED_UI_COMPONENTS = {
  progressBar: {
    id: "progress-bar",
    label: "Progressbar",
    params: "percent: number (0–100)",
    build: buildProgressBarFrame,
  },
  gauge: {
    id: "gauge",
    label: "Gauge (Halbkreis-Ring)",
    params: "percent: number (0–100)",
    build: buildGaugeFrame,
  },
  volumeBars: {
    id: "volume-bars",
    label: "Volume-Balken",
    params: "level: number (0–VOLUME_SEGMENT_COUNT)",
    build: buildVolumeBarsFrame,
  },
  sparkline: {
    id: "sparkline",
    label: "Sparkline",
    params: "samples: readonly number[] (0–1 normalisiert)",
    build: buildSparklineFrame,
  },
  clock: {
    id: "clock",
    label: "Uhr",
    params: "date?: Date",
    build: buildClockFrame,
  },
  statusTile: {
    id: "status-tile",
    label: "Status-Kachel",
    params: 'variant: "mic-on" | "gg-ok" | "bt" | "warn"',
    build: buildStatusTileFrame,
  },
  equalizer: {
    id: "equalizer",
    label: "Equalizer",
    params: "barHeights: readonly number[] (0–100, 9 Balken)",
    build: buildEqualizerFrame,
  },
  spinner: {
    id: "spinner",
    label: "Spinner",
    params: "frameIndex: number (Rotations-Tick)",
    build: buildSpinnerFrame,
  },
  marquee: {
    id: "marquee",
    label: "Marquee",
    params: "pixelOffset: number",
    build: buildMarqueeFrame,
  },
  sevenSegment: {
    id: "seven-segment",
    label: "7-Segment-Anzeige",
    params: "value: number (0–999)",
    build: buildSevenSegmentFrame,
  },
} as const satisfies Record<string, OledComponentEntry<(...args: never[]) => OledBitmapFrame>>;
