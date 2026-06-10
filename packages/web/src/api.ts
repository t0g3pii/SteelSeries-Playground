import type { ComponentTestId } from "./component-tests";
import type { FeatureTestInfo } from "./feature-test";

export interface StatusResponse {
  gameSense: {
    connected: boolean;
    address: string | null;
    error: string | null;
  };
  display: {
    running: boolean;
    moduleId: string | null;
    refreshIntervalMs: number;
    lastUpdate: string | null;
    lastError: string | null;
  };
  modules: Array<{ id: string; name: string }>;
}

export interface IpResponse {
  lan: string;
  wan: string;
  refreshIntervalMs: number;
}

export interface DeadzoneInfo {
  drawable: { top: number; left: number; width: number; height: number };
  /** Gesendetes GameSense-Bitmap. */
  screen: { width: number; height: number };
  margins: { top: number; bottom: number; left: number; right: number };
  lineHeight: number;
  maxTextLines: number;
  deviceVisibleTextLines: number;
  screens: Array<{ key: string; width: number; height: number }>;
}

export type MediaAppIconId =
  | "spotify"
  | "chrome"
  | "firefox"
  | "opera"
  | "vlc"
  | "jellyfin"
  | "edge"
  | "media";

export interface MediaNowPlaying {
  available: boolean;
  title: string;
  artist: string;
  album: string;
  status: string;
  appName: string;
  appIcon: MediaAppIconId;
  appLabel: string;
  hasTimeline: boolean;
  positionMs: number;
  durationMs: number;
  timeline: string | null;
  error: string | null;
}

export type OledFrameKind =
  | "idle"
  | "ip"
  | "media"
  | "feature-test"
  | "progress-bar-test"
  | "gauge-test"
  | "component-test"
  | "text";

export interface OledDeviceView {
  maskBelowY: number;
}

export interface OledPreviewResponse {
  width: number;
  height: number;
  displayHeight: number;
  deviceView: OledDeviceView;
  activeDisplayMode: "bitmap" | "text";
  frameKind: OledFrameKind;
  componentTestId: ComponentTestId | null;
  media: MediaNowPlaying | null;
  running: boolean;
  lan: string;
  wan: string;
  bitmap: number[];
  lines: { lan: string; wan: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Anfrage fehlgeschlagen (${response.status})`);
  }
  return data as T;
}

export const api = {
  getStatus: () => request<StatusResponse>("/api/status"),
  startDisplay: (moduleId = "ip") =>
    request<{ ok: boolean }>("/api/display/start", {
      method: "POST",
      body: JSON.stringify({ moduleId }),
    }),
  stopDisplay: () =>
    request<{ ok: boolean }>("/api/display/stop", { method: "POST" }),
  refreshDisplay: () =>
    request<{ ok: boolean }>("/api/display/refresh", { method: "POST" }),
  getDeadzone: () => request<DeadzoneInfo>("/api/display/deadzone"),
  getOledPreview: () => request<OledPreviewResponse>("/api/display/preview"),
  getFeatureTestInfo: () =>
    request<FeatureTestInfo>("/api/display/feature-test"),
  showFeatureTest: () =>
    request<{ ok: boolean }>("/api/display/feature-test", { method: "POST" }),
  showProgressBarTest: () =>
    request<{ ok: boolean }>("/api/display/progress-bar-test", {
      method: "POST",
    }),
  showGaugeTest: () =>
    request<{ ok: boolean }>("/api/display/gauge-test", { method: "POST" }),
  showComponentTest: (id: ComponentTestId) =>
    request<{ ok: boolean }>("/api/display/component-test", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  getIps: () => request<IpResponse>("/api/modules/ip"),
  getMedia: () =>
    request<MediaNowPlaying & { refreshIntervalMs: number }>(
      "/api/modules/media",
    ),
};
