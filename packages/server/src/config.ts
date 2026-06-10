export const GAME_ID = "GAMEDAC_DASHBOARD";
export const EVENT_ID = "SCREEN_UPDATE";
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
export const PORT = 3000;

export const CORE_PROPS_PATHS = {
  win32: `${process.env.PROGRAMDATA ?? "C:\\ProgramData"}\\SteelSeries\\SteelSeries Engine 3\\coreProps.json`,
  darwin: "/Library/Application Support/SteelSeries Engine 3/coreProps.json",
  linux: "/var/lib/SteelSeries/SteelSeries Engine 3/coreProps.json",
} as const;
