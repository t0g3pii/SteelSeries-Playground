import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./config.js";
import { DisplayManager } from "./display/manager.js";
import { GameSenseClient } from "./gamesense/client.js";
import { ModuleRegistry } from "./modules/registry.js";
import { createApiRouter } from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../web/dist");

const gameSense = new GameSenseClient();
const registry = new ModuleRegistry();
const displayManager = new DisplayManager(gameSense, registry);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", createApiRouter(gameSense, displayManager, registry));

if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`GameDAC Dashboard API läuft auf http://localhost:${PORT}`);
  if (!existsSync(webDist)) {
    console.log(
      "Web-UI nicht gebaut — starte Vite separat: npm run dev --workspace=@gamedac/web",
    );
  }
});

process.on("SIGINT", async () => {
  await displayManager.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await displayManager.stop();
  process.exit(0);
});
