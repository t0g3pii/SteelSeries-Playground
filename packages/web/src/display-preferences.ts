import type { ModuleInfo } from "./api";
import {
  defaultModuleSettings,
  moduleSettingsFromEvents,
  type ModuleSettingsMap,
} from "./module-rotation-settings";

export type DisplayUiMode = "single" | "rotation";

export interface RotationPreferences {
  moduleIds: string[];
  intervalSec: number;
  eventHoldSec: number;
  moduleSettings: ModuleSettingsMap;
}

export interface DisplayPreferences {
  mode: DisplayUiMode;
  moduleId: string;
  rotation: RotationPreferences;
}

const STORAGE_KEY = "gamedac.displayPreferences";

const DEFAULT_MODULE_SETTINGS: ModuleSettingsMap = {
  media: { "media:track-changed": true },
  template: { "template:full-hour": false },
};

const DEFAULTS: DisplayPreferences = {
  mode: "single",
  moduleId: "ip",
  rotation: {
    moduleIds: ["ip", "media"],
    intervalSec: 15,
    eventHoldSec: 15,
    moduleSettings: { ...DEFAULT_MODULE_SETTINGS },
  },
};

function isDisplayUiMode(value: unknown): value is DisplayUiMode {
  return value === "single" || value === "rotation";
}

function parseLegacyRotation(
  rotation: Partial<RotationPreferences> & { onTrackChange?: boolean },
  modules: ModuleInfo[],
): ModuleSettingsMap {
  if (rotation.moduleSettings && typeof rotation.moduleSettings === "object") {
    return rotation.moduleSettings;
  }

  const settings = defaultModuleSettings(modules);
  if (typeof rotation.onTrackChange === "boolean") {
    settings.media = {
      ...(settings.media ?? {}),
      "media:track-changed": rotation.onTrackChange,
    };
  }

  return Object.keys(settings).length > 0
    ? settings
    : { ...DEFAULT_MODULE_SETTINGS };
}

export function loadDisplayPreferences(
  modules: ModuleInfo[] = [],
): DisplayPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULTS,
        rotation: {
          ...DEFAULTS.rotation,
          moduleIds: [...DEFAULTS.rotation.moduleIds],
          moduleSettings: { ...DEFAULT_MODULE_SETTINGS },
        },
      };
    }

    const parsed = JSON.parse(raw) as Partial<DisplayPreferences>;
    const rotation = (parsed.rotation ?? {}) as Partial<RotationPreferences> & {
      onTrackChange?: boolean;
    };

    return {
      mode: isDisplayUiMode(parsed.mode) ? parsed.mode : DEFAULTS.mode,
      moduleId:
        typeof parsed.moduleId === "string" && parsed.moduleId.length > 0
          ? parsed.moduleId
          : DEFAULTS.moduleId,
      rotation: {
        moduleIds: Array.isArray(rotation.moduleIds)
          ? rotation.moduleIds.filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            )
          : [...DEFAULTS.rotation.moduleIds],
        intervalSec:
          typeof rotation.intervalSec === "number" && rotation.intervalSec > 0
            ? rotation.intervalSec
            : DEFAULTS.rotation.intervalSec,
        eventHoldSec:
          typeof rotation.eventHoldSec === "number" && rotation.eventHoldSec > 0
            ? rotation.eventHoldSec
            : DEFAULTS.rotation.eventHoldSec,
        moduleSettings: parseLegacyRotation(rotation, modules),
      },
    };
  } catch {
    return {
      ...DEFAULTS,
      rotation: {
        ...DEFAULTS.rotation,
        moduleIds: [...DEFAULTS.rotation.moduleIds],
        moduleSettings: { ...DEFAULT_MODULE_SETTINGS },
      },
    };
  }
}

export function saveDisplayPreferences(prefs: DisplayPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function sanitizeModuleId(
  moduleId: string,
  availableIds: string[],
): string {
  if (availableIds.includes(moduleId)) {
    return moduleId;
  }
  return availableIds[0] ?? DEFAULTS.moduleId;
}

export function prefsFromRunningDisplay(
  display: {
    running: boolean;
    mode: DisplayUiMode;
    moduleId: string | null;
    rotation: {
      moduleIds: string[];
      intervalMs: number;
      eventHoldMs: number;
      events: string[];
    } | null;
  },
  availableIds: string[],
  modules: ModuleInfo[],
  current: DisplayPreferences,
): DisplayPreferences {
  if (!display.running) {
    return current;
  }

  if (display.mode === "rotation" && display.rotation) {
    const moduleIds = sanitizeRotationModuleIds(
      display.rotation.moduleIds,
      availableIds,
    );

    return {
      ...current,
      mode: "rotation",
      rotation: {
        moduleIds,
        intervalSec: Math.round(display.rotation.intervalMs / 1000),
        eventHoldSec: Math.round(display.rotation.eventHoldMs / 1000),
        moduleSettings: moduleSettingsFromEvents(
          moduleIds,
          display.rotation.events,
          modules,
          current.rotation.moduleSettings,
        ),
      },
    };
  }

  if (display.mode === "single" && display.moduleId) {
    return {
      ...current,
      mode: "single",
      moduleId: sanitizeModuleId(display.moduleId, availableIds),
    };
  }

  return current;
}

export function sanitizeRotationModuleIds(
  moduleIds: string[],
  availableIds: string[],
): string[] {
  const filtered = moduleIds.filter((id) => availableIds.includes(id));
  if (filtered.length > 0) {
    return filtered;
  }
  const fallback = availableIds.filter((id) => id === "ip" || id === "media");
  return fallback.length > 0 ? fallback : availableIds.slice(0, 2);
}
