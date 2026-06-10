import type { ScreenHandler } from "../gamesense/client.js";
import { getLocalIpv4 } from "../network/local-ipv4.js";
import {
  buildImageFrame,
  getBitmapScreenHandlers,
} from "../oled/renderer.js";
import {
  buildTextFrame,
  getTextScreenHandlers,
} from "../oled/text-handler.js";
import type { DisplayFrame, DisplayModule } from "./types.js";

const WAN_TIMEOUT_MS = 5_000;

export type DisplayMode = "bitmap" | "text";

function getDisplayMode(): DisplayMode {
  const mode = process.env.DISPLAY_MODE?.toLowerCase();
  return mode === "text" ? "text" : "bitmap";
}

async function getExternalIpv4(): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WAN_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });

    if (!response.ok) {
      return "---";
    }

    const data = (await response.json()) as { ip?: string };
    return data.ip ?? "---";
  } catch {
    return "---";
  } finally {
    clearTimeout(timeout);
  }
}

export class IpModule implements DisplayModule {
  readonly id = "ip";
  readonly name = "IP-Anzeige";

  private cachedLan = "---";
  private cachedWan = "---";

  getDisplayMode(): DisplayMode {
    return getDisplayMode();
  }

  getScreenHandlers(): ScreenHandler[] {
    return getDisplayMode() === "text"
      ? getTextScreenHandlers()
      : getBitmapScreenHandlers();
  }

  async fetchIps(): Promise<{ lan: string; wan: string }> {
    const [lan, wan] = await Promise.all([getLocalIpv4(), getExternalIpv4()]);
    this.cachedLan = lan;
    this.cachedWan = wan;
    return { lan, wan };
  }

  async getFrame(): Promise<DisplayFrame> {
    const { lan, wan } = await this.fetchIps();

    if (getDisplayMode() === "text") {
      return buildTextFrame(lan, wan);
    }

    return buildImageFrame(lan, wan);
  }

  getCachedIps(): { lan: string; wan: string } {
    return { lan: this.cachedLan, wan: this.cachedWan };
  }
}
