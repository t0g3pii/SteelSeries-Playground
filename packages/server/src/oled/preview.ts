import type { MediaNowPlaying } from "../modules/media-module.js";
import type { IpModule } from "../modules/ip-module.js";
import {
  devicePreviewMaskBelowY,
  IMAGE_DATA_KEY,
  OLED_WIDTH,
} from "./deadzone.js";
import { buildOfflineFrame, buildImageFrame } from "./renderer.js";
import { buildTextFrame } from "./text-handler.js";

export const OLED_PREVIEW_HEIGHT = 64;

export type OledFrameKind =
  | "idle"
  | "ip"
  | "media"
  | "feature-test"
  | "progress-bar-test"
  | "gauge-test"
  | "component-test"
  | "text";

export type ComponentTestId =
  | "volume-bars"
  | "sparkline"
  | "clock"
  | "status-tile"
  | "equalizer"
  | "spinner"
  | "marquee"
  | "seven-segment";

export interface OledDeviceView {
  /** Ab dieser Y-Zeile ist auf dem GameDAC nichts mehr sichtbar (Y≥52 bei 64px-Bitmap). */
  maskBelowY: number;
}

export interface OledPreviewResponse {
  width: number;
  /** Gesendetes Bitmap (64px). */
  height: number;
  /** Geräteansicht-Höhe (52px). */
  displayHeight: number;
  deviceView: OledDeviceView;
  activeDisplayMode: "bitmap" | "text";
  frameKind: OledFrameKind;
  activeModuleId: string | null;
  componentTestId: ComponentTestId | null;
  media: MediaNowPlaying | null;
  running: boolean;
  lan: string;
  wan: string;
  /** Gesendeter GameSense-Frame (128×64); Geräteansicht nutzt displayHeight. */
  bitmap: number[];
  lines: { lan: string; wan: string };
}

export interface OledPreviewParams {
  ipModule: IpModule;
  media: MediaNowPlaying | null;
  running: boolean;
  frameKind: OledFrameKind;
  activeModuleId?: string | null;
  lastFrame: Record<string, unknown> | null;
  componentTestId?: ComponentTestId | null;
}

function bitmapFromFrame(
  frame: Record<string, unknown> | null,
): number[] | null {
  if (!frame) return null;
  const data = frame[IMAGE_DATA_KEY];
  return Array.isArray(data) ? (data as number[]) : null;
}

export function buildOledPreview(params: OledPreviewParams): OledPreviewResponse {
  const {
    ipModule,
    media,
    running,
    frameKind,
    activeModuleId = null,
    lastFrame,
    componentTestId = null,
  } = params;

  const { lan, wan } = ipModule.getCachedIps();
  const activeDisplayMode = ipModule.getDisplayMode();
  const formatted = buildTextFrame(lan, wan);

  const lines = {
    lan:
      running && frameKind === "text" && lastFrame
        ? String(lastFrame.lan ?? formatted.lan)
        : formatted.lan,
    wan:
      running && frameKind === "text" && lastFrame
        ? String(lastFrame.wan ?? formatted.wan)
        : formatted.wan,
  };

  const sent = running ? bitmapFromFrame(lastFrame) : null;
  const bitmap =
    sent ??
    (running
      ? buildImageFrame(lan, wan)[IMAGE_DATA_KEY]!
      : buildOfflineFrame()[IMAGE_DATA_KEY]!);

  const kind = running ? frameKind : "idle";

  const displayHeight = devicePreviewMaskBelowY(OLED_PREVIEW_HEIGHT);

  return {
    width: OLED_WIDTH,
    height: OLED_PREVIEW_HEIGHT,
    displayHeight,
    deviceView: {
      maskBelowY: displayHeight,
    },
    activeDisplayMode,
    frameKind: kind,
    activeModuleId: running ? activeModuleId : null,
    componentTestId: running ? componentTestId : null,
    media: running && (activeModuleId === "media" || frameKind === "media")
      ? media
      : null,
    running,
    lan,
    wan,
    bitmap,
    lines,
  };
}
