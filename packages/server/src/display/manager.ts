import {
  DEFAULT_REFRESH_INTERVAL_MS,
  EVENT_ID,
  GAME_ID,
  HEARTBEAT_INTERVAL_MS,
} from "../config.js";
import type { GameSenseClient } from "../gamesense/client.js";
import type { ModuleRegistry } from "../modules/registry.js";
import {
  devicePreviewMaskBelowY,
  IMAGE_DATA_KEY,
} from "../oled/deadzone.js";
import type { ComponentTestId } from "../oled/component-tests.js";
import {
  buildOledPreview,
  type OledFrameKind,
  type OledPreviewResponse,
} from "../oled/preview.js";
import { buildOfflineFrame } from "../oled/renderer.js";
import type { IpModule } from "../modules/ip-module.js";
import type { MediaModule } from "../modules/media-module.js";
import type { DisplayFrame, DisplayModule } from "../modules/types.js";
import {
  startFeatureTest,
  type FeatureTestRunner,
} from "./feature-test-runner.js";
import {
  startProgressBarTest,
  type ProgressBarTestRunner,
} from "./progress-bar-test-runner.js";
import {
  startGaugeTest,
  type GaugeTestRunner,
} from "./gauge-test-runner.js";
import {
  startComponentTest,
  type ComponentTestRunner,
} from "./component-test-runner.js";

type ManualTestRunner =
  | FeatureTestRunner
  | ProgressBarTestRunner
  | GaugeTestRunner
  | ComponentTestRunner;

export interface DisplayStatus {
  running: boolean;
  moduleId: string | null;
  refreshIntervalMs: number;
  lastUpdate: string | null;
  lastError: string | null;
}

export class DisplayManager {
  private running = false;
  private activeModuleId: string | null = null;
  private refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS;
  private lastUpdate: Date | null = null;
  private lastError: string | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventCounter = 0;
  private oledFrameKind: OledFrameKind = "idle";
  private lastFrame: DisplayFrame | null = null;
  private manualTestRunner: ManualTestRunner | null = null;
  private manualTestActive = false;
  private componentTestId: ComponentTestId | null = null;

  constructor(
    private readonly gameSense: GameSenseClient,
    private readonly registry: ModuleRegistry,
  ) {}

  getStatus(): DisplayStatus {
    return {
      running: this.running,
      moduleId: this.activeModuleId,
      refreshIntervalMs: this.refreshIntervalMs,
      lastUpdate: this.lastUpdate?.toISOString() ?? null,
      lastError: this.lastError,
    };
  }

  getRefreshIntervalMs(): number {
    return this.refreshIntervalMs;
  }

  setRefreshIntervalMs(ms: number): void {
    this.refreshIntervalMs = Math.max(50, Math.min(ms, 300_000));

    if (this.running) {
      this.restartRefreshTimer();
    }
  }

  async start(moduleId = "ip"): Promise<void> {
    if (this.running) {
      return;
    }

    const connected = await this.gameSense.connect();
    if (!connected) {
      throw new Error(
        this.gameSense.error ?? "SteelSeries GG nicht erreichbar",
      );
    }

    const module = this.registry.get(moduleId);
    if (!module) {
      throw new Error(`Modul '${moduleId}' nicht gefunden`);
    }

    await this.gameSense.setMetadata(
      GAME_ID,
      "GameDAC Dashboard",
      "SteelSeries Playground",
    );

    try {
      await this.gameSense.stopGame(GAME_ID);
    } catch {
      // Kein laufendes Spiel — ignorieren.
    }

    await this.gameSense.removeGameEvent(GAME_ID, EVENT_ID);

    await this.gameSense.bindGameEvent({
      game: GAME_ID,
      event: EVENT_ID,
      value_optional: true,
      handlers: module.getScreenHandlers(),
    });

    this.activeModuleId = moduleId;
    this.running = true;
    this.lastError = null;
    this.oledFrameKind = "idle";
    this.lastFrame = null;

    if (module.preferredRefreshIntervalMs) {
      this.setRefreshIntervalMs(module.preferredRefreshIntervalMs);
    }

    await this.pushUpdate();

    this.heartbeatTimer = setInterval(() => {
      void this.gameSense.sendHeartbeat(GAME_ID).catch((err) => {
        this.lastError =
          err instanceof Error ? err.message : "Heartbeat fehlgeschlagen";
      });
    }, HEARTBEAT_INTERVAL_MS);

    this.restartRefreshTimer();
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.clearTimers();
    this.running = false;
    this.activeModuleId = null;
    this.oledFrameKind = "idle";

    try {
      if (this.gameSense.isConnected) {
        const offlineFrame = buildOfflineFrame();
        this.lastFrame = offlineFrame;
        await this.sendFrame(offlineFrame);
        await this.gameSense.stopGame(GAME_ID);
      }
    } catch (err) {
      this.lastError =
        err instanceof Error ? err.message : "Stop fehlgeschlagen";
    } finally {
      this.lastFrame = null;
    }
  }

  async refreshNow(): Promise<void> {
    if (!this.running) {
      throw new Error("Display läuft nicht");
    }
    this.stopManualTest();
    await this.pushUpdate();
  }

  async showFeatureTest(): Promise<void> {
    if (!this.running) {
      throw new Error("Display läuft nicht");
    }

    this.assertBitmapMode();

    this.stopManualTest();
    this.manualTestActive = true;
    this.oledFrameKind = "feature-test";

    this.manualTestRunner = startFeatureTest(
      async (frame) => {
        await this.sendFrame(frame);
      },
      () => {
        this.finishManualTest("Feature-Test-Abschluss fehlgeschlagen");
      },
    );
  }

  async showProgressBarTest(): Promise<void> {
    if (!this.running) {
      throw new Error("Display läuft nicht");
    }

    this.assertBitmapMode();

    this.stopManualTest();
    this.manualTestActive = true;
    this.oledFrameKind = "progress-bar-test";

    this.manualTestRunner = startProgressBarTest(
      async (frame) => {
        await this.sendFrame(frame);
      },
      () => {
        this.finishManualTest("Progressbar-Test-Abschluss fehlgeschlagen");
      },
    );
  }

  async showGaugeTest(): Promise<void> {
    if (!this.running) {
      throw new Error("Display läuft nicht");
    }

    this.assertBitmapMode();

    this.stopManualTest();
    this.manualTestActive = true;
    this.oledFrameKind = "gauge-test";

    this.manualTestRunner = startGaugeTest(
      async (frame) => {
        await this.sendFrame(frame);
      },
      () => {
        this.finishManualTest("Gauge-Test-Abschluss fehlgeschlagen");
      },
    );
  }

  async showComponentTest(id: ComponentTestId): Promise<void> {
    if (!this.running) {
      throw new Error("Display läuft nicht");
    }

    this.assertBitmapMode();

    this.stopManualTest();
    this.manualTestActive = true;
    this.componentTestId = id;
    this.oledFrameKind = "component-test";

    this.manualTestRunner = startComponentTest(
      id,
      async (frame) => {
        await this.sendFrame(frame);
      },
      () => {
        this.finishManualTest("Komponenten-Test-Abschluss fehlgeschlagen");
      },
    );
  }

  getOledPreview(): OledPreviewResponse {
    const ipModule = this.registry.get("ip") as IpModule | undefined;
    if (!ipModule) {
      return {
        width: 128,
        height: 64,
        displayHeight: devicePreviewMaskBelowY(64),
        deviceView: { maskBelowY: devicePreviewMaskBelowY(64) },
        activeDisplayMode: "bitmap",
        frameKind: "idle",
        componentTestId: null,
        media: null,
        running: this.running,
        lan: "---",
        wan: "---",
        bitmap: buildOfflineFrame()[IMAGE_DATA_KEY]!,
        lines: { lan: "---", wan: "---" },
      };
    }

    const mediaModule = this.registry.get("media") as MediaModule | undefined;

    return buildOledPreview({
      ipModule,
      media: mediaModule?.getCachedNowPlaying() ?? null,
      running: this.running,
      frameKind: this.oledFrameKind,
      lastFrame: this.lastFrame,
      componentTestId: this.componentTestId,
    });
  }

  private restartRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      void this.pushUpdate().catch((err) => {
        this.lastError =
          err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen";
      });
    }, this.refreshIntervalMs);
  }

  private clearTimers(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.stopManualTest();
  }

  private stopManualTest(): void {
    this.manualTestRunner?.stop();
    this.manualTestRunner = null;
    this.manualTestActive = false;
    this.componentTestId = null;
  }

  private finishManualTest(errorLabel: string): void {
    this.manualTestActive = false;
    this.manualTestRunner = null;
    this.componentTestId = null;
    void this.pushUpdate().catch((err) => {
      this.lastError = err instanceof Error ? err.message : errorLabel;
    });
  }

  private resolveFrameKind(moduleId: string, module: DisplayModule): OledFrameKind {
    if (moduleId === "media") {
      return "media";
    }
    const ipModule = module as IpModule;
    return ipModule.getDisplayMode?.() === "text" ? "text" : "ip";
  }

  private assertBitmapMode(): void {
    const ipModule = this.registry.get("ip") as IpModule | undefined;
    if (ipModule?.getDisplayMode() === "text") {
      throw new Error("OLED-Tests nur im Bitmap-Modus verfügbar");
    }
  }

  private async pushUpdate(): Promise<void> {
    if (this.manualTestActive) {
      return;
    }

    if (!this.activeModuleId) {
      return;
    }

    const module = this.registry.get(this.activeModuleId);
    if (!module) {
      return;
    }

    this.oledFrameKind = this.resolveFrameKind(this.activeModuleId, module);

    const frame = await module.getFrame();
    await this.sendFrame(frame);
  }

  private async sendFrame(frame: DisplayFrame): Promise<void> {
    this.lastFrame = frame;
    this.eventCounter += 1;

    await this.gameSense.sendGameEvent({
      game: GAME_ID,
      event: EVENT_ID,
      data: {
        value: this.eventCounter,
        frame,
      },
    });

    this.lastUpdate = new Date();
    this.lastError = null;
  }

  getIpPreview(): { lan: string; wan: string } {
    const ipModule = this.registry.get("ip") as IpModule | undefined;
    return ipModule?.getCachedIps() ?? { lan: "---", wan: "---" };
  }
}
