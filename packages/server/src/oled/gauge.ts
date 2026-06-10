import { Display } from "./display.js";
import {
  bitmapBytes,
  contentPadding,
  deviceVisibleHeight,
  OLED_SCREENS,
} from "./deadzone.js";
import { OledFont } from "./oled-font.js";
import { clampProgressPercent } from "./progress-bar.js";

const font = OledFont.loadSmall6x8();

/** Bogen von links (0 %) über oben nach rechts (100 %). */
export const GAUGE_ARC_START_RAD = Math.PI;
export const GAUGE_ARC_SWEEP_RAD = Math.PI;

/** 100 Segmente = 1 Segment pro Prozent. */
export const GAUGE_ARC_SEGMENTS = 100;

/** Innerer Bogen — etwas größer für mehr Innenraum. */
export const GAUGE_INNER_RADIUS_PX = 20;

/** Äußerer Bogen — Hardware-verifiziert (128×52). */
export const GAUGE_OUTER_RADIUS_PX = 36;

export const GAUGE_RING_THICKNESS_PX =
  GAUGE_OUTER_RADIUS_PX - GAUGE_INNER_RADIUS_PX;

function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: Math.round(cx + radius * Math.cos(angleRad)),
    y: Math.round(cy + radius * Math.sin(angleRad)),
  };
}

function drawArcLine(
  display: Display,
  cx: number,
  cy: number,
  radius: number,
  startRad: number,
  sweepRad: number,
  segments: number,
  color: 0 | 1,
): void {
  for (let i = 0; i <= segments; i++) {
    const t = segments === 0 ? 0 : i / segments;
    const angle = startRad + sweepRad * t;
    const { x, y } = polarPoint(cx, cy, radius, angle);
    display.drawPixel(x, y, color);
  }
}

function normalizeAngle(angleRad: number): number {
  let angle = angleRad;
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

function isAngleInSweep(
  angleRad: number,
  startRad: number,
  sweepRad: number,
): boolean {
  if (sweepRad <= 0) return false;

  const angle = normalizeAngle(angleRad);
  const start = normalizeAngle(startRad);
  const end = normalizeAngle(startRad + sweepRad);

  if (start <= end) {
    return angle >= start && angle <= end;
  }
  return angle >= start || angle <= end;
}

/** Gefüllter Ring-Sektor — solide Fläche zwischen innerem und äußerem Bogen. */
function fillArcRing(
  display: Display,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startRad: number,
  sweepRad: number,
  color: 0 | 1,
): void {
  const minX = Math.floor(cx - outerR);
  const maxX = Math.ceil(cx + outerR);
  const minY = Math.floor(cy - outerR);
  const maxY = Math.ceil(cy);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < innerR || dist > outerR) continue;
      if (!isAngleInSweep(Math.atan2(dy, dx), startRad, sweepRad)) continue;
      display.drawPixel(x, y, color);
    }
  }
}

function drawRingEndCap(
  display: Display,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  angleRad: number,
  color: 0 | 1,
): void {
  for (let r = innerR; r <= outerR; r++) {
    const { x, y } = polarPoint(cx, cy, r, angleRad);
    display.drawPixel(x, y, color);
  }
}

function drawRingTrackOutline(
  display: Display,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startRad: number,
  sweepRad: number,
  segments: number,
): void {
  drawArcLine(display, cx, cy, innerR, startRad, sweepRad, segments, 1);
  drawArcLine(display, cx, cy, outerR, startRad, sweepRad, segments, 1);
  drawRingEndCap(display, cx, cy, innerR, outerR, startRad, 1);
  drawRingEndCap(display, cx, cy, innerR, outerR, startRad + sweepRad, 1);
}

function gaugeLayout(width: number, height: number): {
  cx: number;
  cy: number;
  titleY: number;
  valueY: number;
} {
  const visibleH = deviceVisibleHeight(height);
  const cx = Math.floor(width / 2);
  const cy = visibleH - 2;
  const titleY = contentPadding(height);
  const valueY = cy - Math.floor(GAUGE_INNER_RADIUS_PX * 0.42);

  return { cx, cy, titleY, valueY };
}

function renderGaugeBitmap(
  width: number,
  height: number,
  percent: number,
): number[] {
  const display = new Display(width, height);
  display.clear();

  const p = clampProgressPercent(percent);
  const { cx, cy, titleY, valueY } = gaugeLayout(width, height);

  display.drawText({
    x: cx,
    y: titleY,
    text: "Gauge",
    font,
    color: 1,
    horizontal_align: "center",
    vertical_align: "top",
  });

  if (p > 0) {
    fillArcRing(
      display,
      cx,
      cy,
      GAUGE_INNER_RADIUS_PX,
      GAUGE_OUTER_RADIUS_PX,
      GAUGE_ARC_START_RAD,
      GAUGE_ARC_SWEEP_RAD * (p / 100),
      1,
    );
  }

  drawRingTrackOutline(
    display,
    cx,
    cy,
    GAUGE_INNER_RADIUS_PX,
    GAUGE_OUTER_RADIUS_PX,
    GAUGE_ARC_START_RAD,
    GAUGE_ARC_SWEEP_RAD,
    GAUGE_ARC_SEGMENTS,
  );

  display.drawText({
    x: cx,
    y: valueY,
    text: `${p}%`,
    font,
    color: 1,
    horizontal_align: "center",
    vertical_align: "middle",
  });

  return display.get();
}

function packFrame(
  raw: number[],
  width: number,
  height: number,
): number[] {
  const length = bitmapBytes(width, height);
  const bitmap = new Array(length).fill(0);
  for (let i = 0; i < Math.min(raw.length, length); i++) {
    bitmap[i] = raw[i]!;
  }
  return bitmap;
}

/** Halbkreis-Gauge 0–100 % — Fortschritt als gefüllter Außenring. */
export function buildGaugeFrame(percent: number): Record<string, number[]> {
  const frame: Record<string, number[]> = {};

  for (const screen of OLED_SCREENS) {
    const raw = renderGaugeBitmap(screen.width, screen.height, percent);
    frame[screen.key] = packFrame(raw, screen.width, screen.height);
  }

  return frame;
}

export const gaugeInfo = {
  innerRadiusPx: GAUGE_INNER_RADIUS_PX,
  outerRadiusPx: GAUGE_OUTER_RADIUS_PX,
  ringThicknessPx: GAUGE_RING_THICKNESS_PX,
  segments: GAUGE_ARC_SEGMENTS,
} as const;
