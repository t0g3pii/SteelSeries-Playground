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
import type {
  DisplayFrame,
  DisplayModule,
  DisplayRotationConfig,
} from "../modules/types.js";
import { ROTATION_TICK_INTERVAL_MS } from "../modules/types.js";
import { DisplayRotationController } from "./rotation.js";
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

export type DisplayMode = "single" | "rotation";

export interface DisplayStatus {
  running: boolean;
  mode: DisplayMode;
  moduleId: string | null;
  rotation: ReturnType<DisplayRotationController["getStatus"]>;
  refreshIntervalMs: number;
  lastUpdate: string | null;
  lastError: string | null;
}

export interface StartDisplayOptions {
  moduleId?: string;
  rotation?: DisplayRotationConfig;
}

export class DisplayManager {
  private running = false;
  private displayMode: DisplayMode = "single";
  private activeModuleId: string | null = null;
  private readonly rotation = new DisplayRotationController();
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
      mode: this.displayMode,
      moduleId: this.activeModuleId,
      rotation: this.rotation.getStatus(),
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

    if (this.running && this.displayMode === "single") {
      this.restartTimers();
    }
  }

  async start(
    options: string | StartDisplayOptions = "ip",
  ): Promise<void> {
    if (this.running) {
      return;
    }

    const connected = await this.gameSense.connect();
    if (!connected) {
      throw new Error(
        this.gameSense.error ?? "SteelSeries GG nicht erreichbar",
      );
    }

    const normalized =
      typeof options === "string"
        ? { moduleId: options }
        : options;

    let moduleIds: string[];
    let initialModuleId: string;

    if (normalized.rotation) {
      moduleIds = this.validateRotationModuleIds(normalized.rotation.moduleIds);
      this.rotation.start(normalized.rotation);
      this.displayMode = "rotation";
      initialModuleId = this.rotation.resolveActiveModuleId() ?? moduleIds[0]!;
    } else {
      const moduleId = normalized.moduleId ?? "ip";
      const module = this.registry.get(moduleId);
      if (!module) {
        throw new Error(`Modul '${moduleId}' nicht gefunden`);
      }
      this.rotation.stop();
      this.displayMode = "single";
      moduleIds = [moduleId];
      initialModuleId = moduleId;
    }

    const handlers = this.collectScreenHandlers(moduleIds);

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
      handlers,
    });

    this.activeModuleId = null;
    this.running = true;
    this.lastError = null;
    this.oledFrameKind = "idle";
    this.lastFrame = null;

    await this.activateModule(initialModuleId);
    await this.pushUpdate();

    this.heartbeatTimer = setInterval(() => {
      void this.gameSense.sendHeartbeat(GAME_ID).catch((err) => {
        this.lastError =
          err instanceof Error ? err.message : "Heartbeat fehlgeschlagen";
      });
    }, HEARTBEAT_INTERVAL_MS);

    this.restartTimers();
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.clearTimers();
    this.running = false;
    this.displayMode = "single";
    this.rotation.stop();
    if (this.activeModuleId) {
      this.registry.get(this.activeModuleId)?.onDeactivate?.();
    }
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

  async switchModule(moduleId: string): Promise<void> {
    if (!this.running) {
      throw new Error("Display läuft nicht");
    }

    if (this.displayMode !== "single") {
      throw new Error("Modulwechsel nur im Einzelmodul-Modus");
    }

    const module = this.registry.get(moduleId);
    if (!module) {
      throw new Error(`Modul '${moduleId}' nicht gefunden`);
    }

    this.stopManualTest();
    await this.activateModule(moduleId);
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
        activeModuleId: null,
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

    const activeModuleId =
      this.displayMode === "rotation"
        ? this.rotation.resolveActiveModuleId()
        : this.activeModuleId;

    return buildOledPreview({
      ipModule,
      media: mediaModule?.getCachedNowPlaying() ?? null,
      running: this.running,
      frameKind: this.oledFrameKind,
      activeModuleId,
      lastFrame: this.lastFrame,
      componentTestId: this.componentTestId,
    });
  }

  private restartTimers(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.running) {
      return;
    }

    if (this.displayMode === "rotation") {
      this.refreshTimer = setInterval(() => {
        void this.rotationTick().catch((err) => {
          this.lastError =
            err instanceof Error ? err.message : "Rotation fehlgeschlagen";
        });
      }, ROTATION_TICK_INTERVAL_MS);
      return;
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

  private resolveFrameKind(module: DisplayModule): OledFrameKind {
    return module.getFrameKind?.() ?? "idle";
  }

  private validateRotationModuleIds(moduleIds: string[]): string[] {
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      throw new Error("Rotations-Warteschlange ist leer");
    }

    const unique: string[] = [];
    for (const id of moduleIds) {
      if (typeof id !== "string" || id.length === 0) {
        throw new Error("Ungültige Modul-ID in Rotations-Warteschlange");
      }
      if (!this.registry.get(id)) {
        throw new Error(`Modul '${id}' nicht gefunden`);
      }
      if (!unique.includes(id)) {
        unique.push(id);
      }
    }

    return unique;
  }

  private collectScreenHandlers(moduleIds: string[]) {
    const seen = new Set<string>();
    const handlers: ReturnType<DisplayModule["getScreenHandlers"]> = [];

    for (const moduleId of moduleIds) {
      const module = this.registry.get(moduleId);
      if (!module) continue;

      for (const handler of module.getScreenHandlers()) {
        const key = `${handler["device-type"]}:${handler.zone}:${handler.mode}`;
        if (seen.has(key)) continue;
        seen.add(key);
        handlers.push(handler);
      }
    }

    if (handlers.length === 0) {
      throw new Error("Keine Screen-Handler für die gewählten Module");
    }

    return handlers;
  }

  private async activateModule(moduleId: string): Promise<DisplayModule | null> {
    if (this.activeModuleId === moduleId) {
      return this.registry.get(moduleId) ?? null;
    }

    if (this.activeModuleId) {
      this.registry.get(this.activeModuleId)?.onDeactivate?.();
    }

    const module = this.registry.get(moduleId);
    if (!module) {
      return null;
    }

    module.onActivate?.();
    this.activeModuleId = moduleId;

    if (
      this.displayMode === "single" &&
      module.preferredRefreshIntervalMs
    ) {
      this.setRefreshIntervalMs(module.preferredRefreshIntervalMs);
    }

    return module;
  }

  /**
   * Rotations-Tick (1 Hz): Events pollen, Slot wechseln, Frames nur bei Bedarf senden.
   * Statische Module (IP) → einmal beim Wechsel, danach nur Heartbeat.
   */
  private async rotationTick(): Promise<void> {
    if (this.manualTestActive || !this.running) {
      return;
    }

    await this.pollRotationEvents();

    const targetModuleId = this.rotation.resolveActiveModuleId();
    if (!targetModuleId) {
      return;
    }

    const moduleChanged = this.activeModuleId !== targetModuleId;
    const module = await this.activateModule(targetModuleId);
    if (!module) {
      return;
    }

    const needsFrame = moduleChanged || module.staticFrame !== true;
    if (!needsFrame) {
      return;
    }

    this.oledFrameKind = this.resolveFrameKind(module);
    const frame = await module.getFrame();
    await this.sendFrame(frame);
  }

  private async pollRotationEvents(): Promise<void> {
    const config = this.rotation.getConfig();
    if (!config) {
      return;
    }

    for (const moduleInfo of this.registry.list()) {
      const module = this.registry.get(moduleInfo.id);
      if (!module?.pollRotationEvent || !module.rotationEvents?.length) {
        continue;
      }

      const hasWatchedEvent = module.rotationEvents.some((eventId) =>
        config.events.includes(eventId),
      );
      if (!hasWatchedEvent) {
        continue;
      }

      const fired = await module.pollRotationEvent();
      if (fired && this.rotation.triggerEvent(fired)) {
        return;
      }
    }
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

    if (!this.running) {
      return;
    }

    if (this.displayMode === "rotation") {
      await this.rotationTick();
      return;
    }

    const targetModuleId = this.activeModuleId;
    if (!targetModuleId) {
      return;
    }

    const module = await this.activateModule(targetModuleId);
    if (!module) {
      return;
    }

    this.oledFrameKind = this.resolveFrameKind(module);

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
