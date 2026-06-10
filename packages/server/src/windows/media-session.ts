import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/query-windows-media.ps1");

export interface WindowsMediaSession {
  available: boolean;
  title: string;
  artist: string;
  album: string;
  status: string;
  appName: string;
  thumbnailBase64: string | null;
  hasTimeline: boolean;
  positionMs: number;
  durationMs: number;
  timelineUpdatedAtMs: number;
  error?: string;
}

const EMPTY: WindowsMediaSession = {
  available: false,
  title: "",
  artist: "",
  album: "",
  status: "none",
  appName: "",
  thumbnailBase64: null,
  hasTimeline: false,
  positionMs: 0,
  durationMs: 0,
  timelineUpdatedAtMs: 0,
};

export function isWindows(): boolean {
  return process.platform === "win32";
}

export async function queryWindowsMediaSession(): Promise<WindowsMediaSession> {
  if (!isWindows()) {
    return { ...EMPTY, error: "Nur unter Windows verfügbar" };
  }

  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_PATH],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string | Buffer) => {
      stdout += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: string | Buffer) => {
      stderr += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });

    child.on("error", (err) => {
      resolve({ ...EMPTY, error: err.message });
    });

    child.on("close", (code) => {
      const line = stdout.trim().split(/\r?\n/).pop()?.trim();
      if (!line) {
        resolve({
          ...EMPTY,
          error: stderr.trim() || `PowerShell beendet mit Code ${code ?? "?"}`,
        });
        return;
      }

      try {
        const parsed = JSON.parse(line) as WindowsMediaSession;
        resolve({
          available: Boolean(parsed.available),
          title: String(parsed.title ?? ""),
          artist: String(parsed.artist ?? ""),
          album: String(parsed.album ?? ""),
          status: String(parsed.status ?? "none"),
          appName: String(parsed.appName ?? ""),
          thumbnailBase64: parsed.thumbnailBase64 ?? null,
          hasTimeline: Boolean(parsed.hasTimeline),
          positionMs: Number(parsed.positionMs) || 0,
          durationMs: Number(parsed.durationMs) || 0,
          timelineUpdatedAtMs: Number(parsed.timelineUpdatedAtMs) || 0,
          error: parsed.error,
        });
      } catch (err) {
        resolve({
          ...EMPTY,
          error:
            err instanceof Error
              ? err.message
              : "Medien-Antwort konnte nicht gelesen werden",
        });
      }
    });
  });
}
