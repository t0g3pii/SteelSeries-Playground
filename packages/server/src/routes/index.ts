import { Router } from "express";
import type { DisplayManager } from "../display/manager.js";
import type { GameSenseClient } from "../gamesense/client.js";
import type { ModuleRegistry } from "../modules/registry.js";
import { createDisplayRouter } from "./display.js";
import { createModulesRouter } from "./modules.js";
import { createOledRouter } from "./oled.js";

export function createApiRouter(
  gameSense: GameSenseClient,
  displayManager: DisplayManager,
  registry: ModuleRegistry,
): Router {
  const router = Router();

  router.get("/status", async (_req, res) => {
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

  router.use("/display", createDisplayRouter(displayManager));
  router.use("/oled", createOledRouter());
  router.use("/modules", createModulesRouter(displayManager, registry));

  return router;
}
