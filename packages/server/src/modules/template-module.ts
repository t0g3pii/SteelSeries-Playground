import type { ScreenHandler } from "../gamesense/client.js";
import { buildClockFrame } from "../oled/clock.js";
import type { OledFrameKind } from "../oled/preview.js";
import { getBitmapScreenHandlers } from "../oled/renderer.js";
import type { DisplayFrame, DisplayModule } from "./types.js";

/**
 * Minimales Beispiel-Modul für eigene OLED-Anzeigen.
 * Kopiere diese Datei, passe id/name/getFrame an und registriere in registry.ts.
 */
export class TemplateModule implements DisplayModule {
  readonly id = "template";
  readonly name = "Template (Uhr)";
  readonly description =
    "Beispiel-Modul — zeigt eine Uhr. Als Vorlage für neue Module.";
  readonly supportsRotation = true;
  readonly preferredRefreshIntervalMs = 1_000;

  getScreenHandlers(): ScreenHandler[] {
    return getBitmapScreenHandlers();
  }

  getFrameKind(): OledFrameKind {
    return "component-test";
  }

  async getFrame(): Promise<DisplayFrame> {
    return buildClockFrame();
  }

  async getModuleData(): Promise<{ label: string; time: string }> {
    const now = new Date();
    return {
      label: this.name,
      time: now.toLocaleTimeString("de-DE"),
    };
  }
}
