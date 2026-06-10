import type { ScreenHandler } from "../gamesense/client.js";
import type { OledFrameKind } from "../oled/preview.js";

export type DisplayFrameValue = string | number[];

export type DisplayFrame = Record<string, DisplayFrameValue>;

/** Events, die die Modul-Rotation unterbrechen können (z. B. neuer Song). */
export type DisplayRotationEventId =
  | "media:track-changed"
  | "template:full-hour";

export interface ModuleRotationSettingDef {
  id: DisplayRotationEventId;
  label: string;
  description?: string;
  /** Standard in der UI, wenn noch nicht gespeichert. */
  defaultEnabled?: boolean;
}

export interface DisplayModuleInfo {
  id: string;
  name: string;
  description?: string;
  supportsRotation?: boolean;
  rotationEvents?: DisplayRotationEventId[];
  rotationSettings?: ModuleRotationSettingDef[];
}

export interface DisplayModule extends DisplayModuleInfo {
  getFrame(): Promise<DisplayFrame>;
  getScreenHandlers(): ScreenHandler[];
  /** Vorschau-Typ für Web-UI (Fallback: idle). */
  getFrameKind?(): OledFrameKind;
  /**
   * Statisches Bild — in der Rotation nur einmal beim Aktivieren senden,
   * danach reicht der Heartbeat (z. B. IP-Anzeige).
   */
  staticFrame?: boolean;
  /** Optional: DisplayManager setzt Intervall beim Start / Modulwechsel. */
  preferredRefreshIntervalMs?: number;
  /** Daten für GET /api/modules/:id */
  getModuleData?(): Promise<unknown>;
  /** Wird beim Aktivieren in der Rotation aufgerufen. */
  onActivate?(): void;
  /** Wird beim Verlassen in der Rotation aufgerufen. */
  onDeactivate?(): void;
  /** Prüft, ob ein Rotations-Event ausgelöst werden soll. */
  pollRotationEvent?(): Promise<DisplayRotationEventId | null>;
}

export interface DisplayRotationConfig {
  moduleIds: string[];
  intervalMs: number;
  eventHoldMs: number;
  events: DisplayRotationEventId[];
}

export const DEFAULT_ROTATION_INTERVAL_MS = 15_000;
export const DEFAULT_EVENT_HOLD_MS = 15_000;

/** Event-Polling + dynamische Module in der Rotation (unabhängig vom IP-Refresh). */
export const ROTATION_TICK_INTERVAL_MS = 1_000;

export const ROTATION_EVENT_TARGETS: Record<
  DisplayRotationEventId,
  string
> = {
  "media:track-changed": "media",
  "template:full-hour": "template",
};

export const DISPLAY_ROTATION_EVENT_IDS: DisplayRotationEventId[] = [
  "media:track-changed",
  "template:full-hour",
];

export function isDisplayRotationEventId(
  value: string,
): value is DisplayRotationEventId {
  return (DISPLAY_ROTATION_EVENT_IDS as string[]).includes(value);
}
