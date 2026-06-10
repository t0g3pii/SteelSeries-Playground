import { Router, type Request, type Response } from "express";
import type { DisplayManager } from "../display/manager.js";
import type { GameSenseClient } from "../gamesense/client.js";
import type { ModuleRegistry } from "../modules/registry.js";
import { OLED_UI_COMPONENTS } from "../oled/api.js";
import { COMPONENT_TEST_LIST } from "../oled/component-tests.js";
import {
  FEATURE_TEST_PHASE_COUNT,
  FEATURE_TEST_SEQUENCE,
  FEATURE_TEST_TOTAL_MS,
} from "../oled/feature-test.js";
import { isComponentTestId } from "../oled/component-tests.js";
import { getDeadzoneInfo } from "../oled/deadzone.js";
import type { IpModule } from "../modules/ip-module.js";

export function createApiRouter(
  gameSense: GameSenseClient,
  displayManager: DisplayManager,
  registry: ModuleRegistry,
): Router {
  const router = Router();

  router.get("/status", async (_req: Request, res: Response) => {
    const connected = await gameSense.connect();
    const display = displayManager.getStatus();

    res.json({
      gameSense: {
        connected,
        address: gameSense.address,
        error: connected ? null : gameSense.error,
      },
      display,
      modules: registry.list(),
    });
  });

  router.post("/display/start", async (req: Request, res: Response) => {
    try {
      const moduleId =
        typeof req.body?.moduleId === "string" ? req.body.moduleId : "ip";
      await displayManager.start(moduleId);
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Start fehlgeschlagen",
      });
    }
  });

  router.post("/display/stop", async (_req: Request, res: Response) => {
    try {
      await displayManager.stop();
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Stop fehlgeschlagen",
      });
    }
  });

  router.get("/display/deadzone", (_req: Request, res: Response) => {
    res.json(getDeadzoneInfo(64));
  });

  router.get("/oled/components", (_req: Request, res: Response) => {
    res.json({
      components: Object.entries(OLED_UI_COMPONENTS).map(([key, component]) => ({
        key,
        id: component.id,
        label: component.label,
        params: component.params,
      })),
    });
  });

  router.get("/display/preview", (_req: Request, res: Response) => {
    res.json(displayManager.getOledPreview());
  });

  router.get("/display/feature-test", (_req: Request, res: Response) => {
    res.json({
      totalMs: FEATURE_TEST_TOTAL_MS,
      phaseCount: FEATURE_TEST_PHASE_COUNT,
      components: FEATURE_TEST_SEQUENCE.components,
    });
  });

  router.post("/display/feature-test", async (_req: Request, res: Response) => {
    try {
      await displayManager.showFeatureTest();
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error:
          err instanceof Error ? err.message : "Feature-Test fehlgeschlagen",
      });
    }
  });

  router.post(
    "/display/progress-bar-test",
    async (_req: Request, res: Response) => {
      try {
        await displayManager.showProgressBarTest();
        res.json({ ok: true, display: displayManager.getStatus() });
      } catch (err) {
        res.status(400).json({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Progressbar-Test fehlgeschlagen",
        });
      }
    },
  );

  router.post("/display/gauge-test", async (_req: Request, res: Response) => {
    try {
      await displayManager.showGaugeTest();
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error:
          err instanceof Error ? err.message : "Gauge-Test fehlgeschlagen",
      });
    }
  });

  router.get("/display/component-tests", (_req: Request, res: Response) => {
    res.json({ tests: COMPONENT_TEST_LIST });
  });

  router.post("/display/component-test", async (req: Request, res: Response) => {
    const id =
      typeof req.body?.id === "string" ? req.body.id : "";

    if (!isComponentTestId(id)) {
      res.status(400).json({ ok: false, error: "Unbekannter Komponenten-Test" });
      return;
    }

    try {
      await displayManager.showComponentTest(id);
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Komponenten-Test fehlgeschlagen",
      });
    }
  });

  router.post("/display/refresh", async (_req: Request, res: Response) => {
    try {
      await displayManager.refreshNow();
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error:
          err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen",
      });
    }
  });

  router.get("/modules/ip", async (_req: Request, res: Response) => {
    const ipModule = registry.get("ip") as IpModule | undefined;
    if (!ipModule) {
      res.status(404).json({ error: "IP-Modul nicht gefunden" });
      return;
    }

    await ipModule.fetchIps();
    const { lan, wan } = ipModule.getCachedIps();
    res.json({
      lan,
      wan,
      refreshIntervalMs: displayManager.getRefreshIntervalMs(),
    });
  });

  router.put("/modules/ip/config", (req: Request, res: Response) => {
    const interval = Number(req.body?.refreshIntervalMs);
    if (!Number.isFinite(interval)) {
      res.status(400).json({ error: "refreshIntervalMs muss eine Zahl sein" });
      return;
    }

    displayManager.setRefreshIntervalMs(interval);
    res.json({
      ok: true,
      refreshIntervalMs: displayManager.getRefreshIntervalMs(),
    });
  });

  return router;
}
