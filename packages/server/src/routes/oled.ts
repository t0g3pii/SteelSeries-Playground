import { Router, type Request, type Response } from "express";
import { OLED_UI_COMPONENTS } from "../oled/api.js";

export function createOledRouter(): Router {
  const router = Router();

  router.get("/components", (_req: Request, res: Response) => {
    res.json({
      components: Object.entries(OLED_UI_COMPONENTS).map(([key, component]) => ({
        key,
        id: component.id,
        label: component.label,
        params: component.params,
      })),
    });
  });

  return router;
}
