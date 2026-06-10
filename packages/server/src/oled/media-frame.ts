import { Display } from "./display.js";
import {
  getMediaAppIconRows,
  resolveMediaAppIconId,
  supportsMediaTimelineDisplay,
} from "./app-icons.js";
import { contentAreaHeight, contentPadding } from "./deadzone.js";
import { fillRect } from "./draw-helpers.js";
import { buildBitmapFrame } from "./frame-pack.js";
import { drawMarqueeLine } from "./marquee-line.js";
import { formatMediaTimeline, hasValidMediaTimeline } from "./media-timeline.js";
import { OledFont } from "./oled-font.js";
import type { WindowsMediaSession } from "../windows/media-session.js";

const font = OledFont.loadSmall6x8();

/** Platz für App-Icon links (ohne Rahmen), Spotify-Referenz 40×40. */
export const MEDIA_ICON_SLOT_PX = 40;

/** @deprecated Alias — früher Cover-Größe. */
export const MEDIA_ICON_BOX_PX = MEDIA_ICON_SLOT_PX;
export const MEDIA_COVER_SIZE_PX = MEDIA_ICON_SLOT_PX;

const MEDIA_TEXT_GAP_PX = 4;
const ICON_MAX_DRAW_PX = 40;
const LINE_GAP_PX = 2;

/** Marquee: Pixel pro Sekunde (1 OLED-Update/s). */
export const MEDIA_MARQUEE_PIXELS_PER_SECOND = 6;

export interface MediaFrameInput {
  session: WindowsMediaSession;
  /** Kumulierter Marquee-Offset in Pixeln (wird 1×/s erhöht). */
  marqueeScrollPx?: number;
  /** Geglättete Anzeige-Position aus letzter GSMTC-Abfrage. */
  timelinePositionMs?: number;
}

interface MediaTextLine {
  text: string;
  marquee: boolean;
}

function mediaTextX(screenHeight: number): number {
  return (
    contentPadding(screenHeight) + MEDIA_ICON_SLOT_PX + MEDIA_TEXT_GAP_PX
  );
}

function mediaTextWidthPx(screenWidth: number, screenHeight: number): number {
  return screenWidth - mediaTextX(screenHeight) - contentPadding(screenHeight);
}

function iconSlotTop(screenHeight: number): number {
  const pad = contentPadding(screenHeight);
  const area = contentAreaHeight(screenHeight);
  return pad + Math.floor((area - MEDIA_ICON_SLOT_PX) / 2);
}

function textLineTop(
  screenHeight: number,
  lineIndex: number,
  lineCount: 1 | 2 | 3,
): number {
  const pad = contentPadding(screenHeight);
  const area = contentAreaHeight(screenHeight);
  if (lineCount === 1) {
    return pad + Math.floor((area - font.height) / 2);
  }
  const blockH =
    lineCount * font.height + (lineCount - 1) * LINE_GAP_PX;
  const blockTop = pad + Math.floor((area - blockH) / 2);
  return blockTop + lineIndex * (font.height + LINE_GAP_PX);
}

function buildMediaTextLines(
  session: WindowsMediaSession,
  timelinePositionMs: number | undefined,
): MediaTextLine[] {
  const title = session.title.trim() || "Unbekannt";
  const artistRaw = session.artist.trim();
  const isJellyfin = resolveMediaAppIconId(session.appName) === "jellyfin";
  const artist =
    artistRaw || (isJellyfin ? "" : "Unbekannter Interpret");

  const showTimeline =
    supportsMediaTimelineDisplay(session.appName) &&
    hasValidMediaTimeline(session.hasTimeline, session.durationMs);
  const timeline =
    showTimeline && timelinePositionMs !== undefined
      ? formatMediaTimeline(timelinePositionMs, session.durationMs)
      : "";

  const lines: MediaTextLine[] = [{ text: title, marquee: true }];

  if (artist) {
    lines.push({ text: artist, marquee: true });
    if (timeline) lines.push({ text: timeline, marquee: false });
  } else if (timeline) {
    lines.push({ text: timeline, marquee: false });
  }

  return lines;
}

function drawScaledIcon(
  display: Display,
  slotX: number,
  slotY: number,
  rows: readonly string[],
): void {
  const srcH = rows.length;
  const srcW = rows[0]?.length ?? srcH;
  const scale = Math.max(
    1,
    Math.floor(Math.min(ICON_MAX_DRAW_PX / srcW, ICON_MAX_DRAW_PX / srcH)),
  );
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;
  const iconX = slotX + Math.floor((MEDIA_ICON_SLOT_PX - scaledW) / 2);
  const iconY = slotY + Math.floor((MEDIA_ICON_SLOT_PX - scaledH) / 2);

  for (let row = 0; row < rows.length; row++) {
    const line = rows[row] ?? "";
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== "1") continue;
      const px = iconX + col * scale;
      const py = iconY + row * scale;
      fillRect(display, px, py, scale, scale, 1);
    }
  }
}

function drawAppIcon(
  display: Display,
  x: number,
  y: number,
  appName: string,
): void {
  drawScaledIcon(display, x, y, getMediaAppIconRows(appName));
}

function renderIdleMedia(display: Display, width: number, height: number): void {
  display.drawText({
    x: Math.floor(width / 2),
    y: contentPadding(height) + Math.floor(contentAreaHeight(height) / 2),
    text: "Keine Medien",
    font,
    color: 1,
    horizontal_align: "center",
    vertical_align: "middle",
  });
}

function renderMediaBitmap(
  width: number,
  height: number,
  input: MediaFrameInput,
): number[] {
  const display = new Display(width, height);
  display.clear();

  const {
    session,
    marqueeScrollPx = 0,
    timelinePositionMs,
  } = input;
  if (!session.available || (!session.title && !session.artist)) {
    renderIdleMedia(display, width, height);
    return display.get();
  }

  const iconX = contentPadding(height);
  const iconY = iconSlotTop(height);
  drawAppIcon(display, iconX, iconY, session.appName);

  const textX = mediaTextX(height);
  const textW = mediaTextWidthPx(width, height);
  const lines = buildMediaTextLines(session, timelinePositionMs);
  const lineCount = lines.length as 1 | 2 | 3;

  lines.forEach((line, index) => {
    if (line.marquee) {
      drawMarqueeLine(
        display,
        line.text,
        textX,
        textLineTop(height, index, lineCount),
        textW,
        font,
        marqueeScrollPx,
        1,
      );
    } else {
      display.drawText({
        x: textX,
        y: textLineTop(height, index, lineCount),
        text: line.text,
        font,
        color: 1,
        vertical_align: "top",
      });
    }
  });

  return display.get();
}

/** Now Playing: App-Icon + Titel / Interpret / Zeit (Marquee bei langen Texten). */
export function buildMediaFrame(
  input: MediaFrameInput,
): Record<string, number[]> {
  return buildBitmapFrame((width, height) =>
    renderMediaBitmap(width, height, input),
  );
}
