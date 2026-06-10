import { readFile } from "node:fs/promises";
import { platform } from "node:os";
import { CORE_PROPS_PATHS } from "../config.js";

export interface CoreProps {
  address: string;
}

export interface ScreenHandler {
  "device-type": string;
  mode: "screen";
  zone: string;
  datas: unknown[];
}

export interface BindGameEventPayload {
  game: string;
  event: string;
  value_optional?: boolean;
  handlers: ScreenHandler[];
}

export interface GameEventPayload {
  game: string;
  event: string;
  data: {
    value: number;
    frame: Record<string, string | number[]>;
  };
}

export class GameSenseClient {
  private baseUrl: string | null = null;
  private lastError: string | null = null;

  get isConnected(): boolean {
    return this.baseUrl !== null;
  }

  get error(): string | null {
    return this.lastError;
  }

  get address(): string | null {
    if (!this.baseUrl) return null;
    return this.baseUrl.replace("http://", "");
  }

  private getCorePropsPath(): string {
    const os = platform();
    if (os === "win32") return CORE_PROPS_PATHS.win32;
    if (os === "darwin") return CORE_PROPS_PATHS.darwin;
    return CORE_PROPS_PATHS.linux;
  }

  async connect(): Promise<boolean> {
    try {
      const path = this.getCorePropsPath();
      const raw = await readFile(path, "utf-8");
      const props = JSON.parse(raw) as CoreProps;

      if (!props.address) {
        throw new Error("coreProps.json enthält keine address");
      }

      this.baseUrl = `http://${props.address}`;
      this.lastError = null;
      return true;
    } catch (err) {
      this.baseUrl = null;
      this.lastError =
        err instanceof Error ? err.message : "SteelSeries GG nicht erreichbar";
      return false;
    }
  }

  private async post(endpoint: string, body: unknown): Promise<void> {
    if (!this.baseUrl) {
      throw new Error("Nicht mit SteelSeries GG verbunden");
    }

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `GameSense ${endpoint} fehlgeschlagen (${response.status}): ${text}`,
      );
    }
  }

  async setMetadata(
    game: string,
    displayName: string,
    developer: string,
  ): Promise<void> {
    await this.post("game_metadata", {
      game,
      game_display_name: displayName,
      developer,
      deinitialize_timer_length_ms: 60_000,
    });
  }

  async removeGameEvent(game: string, event: string): Promise<void> {
    try {
      await this.post("remove_game_event", { game, event });
    } catch {
      // Event existiert noch nicht — ignorieren.
    }
  }

  async bindGameEvent(payload: BindGameEventPayload): Promise<void> {
    await this.post("bind_game_event", payload);
  }

  async sendGameEvent(payload: GameEventPayload): Promise<void> {
    await this.post("game_event", payload);
  }

  async sendHeartbeat(game: string): Promise<void> {
    await this.post("game_heartbeat", { game });
  }

  async stopGame(game: string): Promise<void> {
    await this.post("stop_game", { game });
  }
}
