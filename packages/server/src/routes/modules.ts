import { Router, type Request, type Response } from "express";
import type { DisplayManager } from "../display/manager.js";
import type { ModuleRegistry } from "../modules/registry.js";

export function createModulesRouter(
  displayManager: DisplayManager,
  registry: ModuleRegistry,
): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.json({ modules: registry.list() });
  });

  router.get("/:id", async (req: Request, res: Response) => {
    const moduleId = String(req.params.id);
    const module = registry.get(moduleId);
    if (!module) {
      res.status(404).json({ error: `Modul '${moduleId}' nicht gefunden` });
      return;
    }

    if (!module.getModuleData) {
      res.status(404).json({
        error: `Modul '${moduleId}' liefert keine Daten`,
      });
      return;
    }

    const data = await module.getModuleData();
    res.json({
      id: module.id,
      name: module.name,
      data,
      refreshIntervalMs: displayManager.getRefreshIntervalMs(),
    });
  });

  return router;
}
