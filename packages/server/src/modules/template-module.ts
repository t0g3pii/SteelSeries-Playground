import type { ScreenHandler } from "../gamesense/client.js";
import { buildClockFrame } from "../oled/clock.js";
import type { OledFrameKind } from "../oled/preview.js";
import { getBitmapScreenHandlers } from "../oled/renderer.js";
import type {
  DisplayFrame,
  DisplayModule,
  DisplayRotationEventId,
  ModuleRotationSettingDef,
} from "./types.js";

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
  readonly rotationEvents: DisplayRotationEventId[] = ["template:full-hour"];
  readonly rotationSettings: ModuleRotationSettingDef[] = [
    {
      id: "template:full-hour",
      label: "Zur vollen Stunde priorisieren",
      description:
        "Zeigt die Uhr bei jeder vollen Stunde (z. B. 14:00) für die Event-Dauer.",
      defaultEnabled: false,
    },
  ];
  readonly preferredRefreshIntervalMs = 1_000;

  private lastFullHourKey = "";

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

  async pollRotationEvent(): Promise<DisplayRotationEventId | null> {
    const now = new Date();
    if (now.getMinutes() !== 0) {
      return null;
    }

    const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    if (hourKey === this.lastFullHourKey) {
      return null;
    }

    this.lastFullHourKey = hourKey;
    return "template:full-hour";
  }
}
