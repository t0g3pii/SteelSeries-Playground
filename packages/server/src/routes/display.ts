import { Router, type Request, type Response } from "express";
import type { DisplayManager } from "../display/manager.js";
import type {
  DisplayRotationConfig,
  DisplayRotationEventId,
} from "../modules/types.js";
import {
  DEFAULT_EVENT_HOLD_MS,
  DEFAULT_ROTATION_INTERVAL_MS,
} from "../modules/types.js";
import { getDeadzoneInfo } from "../oled/deadzone.js";
import {
  FEATURE_TEST_PHASE_COUNT,
  FEATURE_TEST_SEQUENCE,
  FEATURE_TEST_TOTAL_MS,
} from "../oled/feature-test.js";
import {
  COMPONENT_TEST_LIST,
  isComponentTestId,
} from "../oled/component-tests.js";

function parseRotationBody(body: unknown): DisplayRotationConfig | null {
  if (!body || typeof body !== "object" || !("rotation" in body)) {
    return null;
  }

  const rotation = (body as { rotation?: unknown }).rotation;
  if (!rotation || typeof rotation !== "object") {
    return null;
  }

  const raw = rotation as {
    moduleIds?: unknown;
    intervalMs?: unknown;
    eventHoldMs?: unknown;
    events?: unknown;
  };

  if (!Array.isArray(raw.moduleIds) || raw.moduleIds.length === 0) {
    throw new Error("rotation.moduleIds muss ein nicht-leeres Array sein");
  }

  const moduleIds = raw.moduleIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  if (moduleIds.length === 0) {
    throw new Error("rotation.moduleIds enthält keine gültigen IDs");
  }

  const events = Array.isArray(raw.events)
    ? raw.events.filter(
        (event): event is DisplayRotationEventId =>
          event === "media:track-changed",
      )
    : [];

  return {
    moduleIds,
    intervalMs:
      typeof raw.intervalMs === "number"
        ? raw.intervalMs
        : DEFAULT_ROTATION_INTERVAL_MS,
    eventHoldMs:
      typeof raw.eventHoldMs === "number"
        ? raw.eventHoldMs
        : DEFAULT_EVENT_HOLD_MS,
    events,
  };
}

export function createDisplayRouter(displayManager: DisplayManager): Router {
  const router = Router();

  router.post("/start", async (req: Request, res: Response) => {
    try {
      const rotation = parseRotationBody(req.body);
      if (rotation) {
        await displayManager.start({ rotation });
      } else {
        const moduleId =
          typeof req.body?.moduleId === "string" ? req.body.moduleId : "ip";
        await displayManager.start({ moduleId });
      }
      res.json({ ok: true, display: displayManager.getStatus() });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Start fehlgeschlagen",
      });
    }
  });

  router.post("/stop", async (_req: Request, res: Response) => {
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

  router.get("/deadzone", (_req: Request, res: Response) => {
    res.json(getDeadzoneInfo(64));
  });

  router.get("/preview", (_req: Request, res: Response) => {
    res.json(displayManager.getOledPreview());
  });

  router.get("/feature-test", (_req: Request, res: Response) => {
    res.json({
      totalMs: FEATURE_TEST_TOTAL_MS,
      phaseCount: FEATURE_TEST_PHASE_COUNT,
      components: FEATURE_TEST_SEQUENCE.components,
    });
  });

  router.post("/feature-test", async (_req: Request, res: Response) => {
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

  router.post("/progress-bar-test", async (_req: Request, res: Response) => {
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
  });

  router.post("/gauge-test", async (_req: Request, res: Response) => {
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

  router.get("/component-tests", (_req: Request, res: Response) => {
    res.json({ tests: COMPONENT_TEST_LIST });
  });

  router.post("/component-test", async (req: Request, res: Response) => {
    const id = typeof req.body?.id === "string" ? req.body.id : "";

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

  router.post("/refresh", async (_req: Request, res: Response) => {
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

  return router;
}
