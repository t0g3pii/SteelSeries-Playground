export type DisplayUiMode = "single" | "rotation";

export interface RotationPreferences {
  moduleIds: string[];
  intervalSec: number;
  eventHoldSec: number;
  onTrackChange: boolean;
}

export interface DisplayPreferences {
  mode: DisplayUiMode;
  moduleId: string;
  rotation: RotationPreferences;
}

const STORAGE_KEY = "gamedac.displayPreferences";

const DEFAULTS: DisplayPreferences = {
  mode: "single",
  moduleId: "ip",
  rotation: {
    moduleIds: ["ip", "media"],
    intervalSec: 15,
    eventHoldSec: 15,
    onTrackChange: true,
  },
};

function isDisplayUiMode(value: unknown): value is DisplayUiMode {
  return value === "single" || value === "rotation";
}

export function loadDisplayPreferences(): DisplayPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULTS, rotation: { ...DEFAULTS.rotation, moduleIds: [...DEFAULTS.rotation.moduleIds] } };
    }

    const parsed = JSON.parse(raw) as Partial<DisplayPreferences>;
    const rotation: Partial<RotationPreferences> = parsed.rotation ?? {};

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
        onTrackChange:
          typeof rotation.onTrackChange === "boolean"
            ? rotation.onTrackChange
            : DEFAULTS.rotation.onTrackChange,
      },
    };
  } catch {
    return { ...DEFAULTS, rotation: { ...DEFAULTS.rotation, moduleIds: [...DEFAULTS.rotation.moduleIds] } };
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
