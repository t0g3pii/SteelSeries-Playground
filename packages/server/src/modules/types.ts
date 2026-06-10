import type { ScreenHandler } from "../gamesense/client.js";

export type DisplayFrameValue = string | number[];

export type DisplayFrame = Record<string, DisplayFrameValue>;

export interface DisplayModule {
  id: string;
  name: string;
  getFrame(): Promise<DisplayFrame>;
  getScreenHandlers(): ScreenHandler[];
  /** Optional: DisplayManager setzt Intervall beim Start. */
  preferredRefreshIntervalMs?: number;
}
