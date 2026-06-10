import type { DisplayRotationEventId, ModuleInfo } from "./api";

export type ModuleSettingsMap = Record<string, Record<string, boolean>>;

export function defaultModuleSettings(
  modules: ModuleInfo[],
): ModuleSettingsMap {
  const settings: ModuleSettingsMap = {};

  for (const module of modules) {
    if (!module.rotationSettings?.length) {
      continue;
    }

    settings[module.id] = {};
    for (const def of module.rotationSettings) {
      settings[module.id][def.id] = def.defaultEnabled ?? false;
    }
  }

  return settings;
}

export function ensureModuleSettings(
  moduleIds: string[],
  moduleSettings: ModuleSettingsMap,
  modules: ModuleInfo[],
): ModuleSettingsMap {
  const next: ModuleSettingsMap = { ...moduleSettings };

  for (const moduleId of moduleIds) {
    const module = modules.find((entry) => entry.id === moduleId);
    if (!module?.rotationSettings?.length) {
      continue;
    }

    next[moduleId] = { ...(next[moduleId] ?? {}) };
    for (const def of module.rotationSettings) {
      if (next[moduleId][def.id] === undefined) {
        next[moduleId][def.id] = def.defaultEnabled ?? false;
      }
    }
  }

  return next;
}

export function rotationEventsFromModuleSettings(
  moduleIds: string[],
  moduleSettings: ModuleSettingsMap,
  modules: ModuleInfo[],
): DisplayRotationEventId[] {
  const events: DisplayRotationEventId[] = [];

  for (const moduleId of moduleIds) {
    const module = modules.find((entry) => entry.id === moduleId);
    const settings = moduleSettings[moduleId] ?? {};

    for (const def of module?.rotationSettings ?? []) {
      if (settings[def.id]) {
        events.push(def.id);
      }
    }
  }

  return [...new Set(events)];
}

export function moduleSettingsFromEvents(
  moduleIds: string[],
  events: string[],
  modules: ModuleInfo[],
  current: ModuleSettingsMap,
): ModuleSettingsMap {
  const next: ModuleSettingsMap = { ...current };

  for (const moduleId of moduleIds) {
    const module = modules.find((entry) => entry.id === moduleId);
    if (!module?.rotationSettings?.length) {
      continue;
    }

    next[moduleId] = { ...(next[moduleId] ?? {}) };
    for (const def of module.rotationSettings) {
      next[moduleId][def.id] = events.includes(def.id);
    }
  }

  return next;
}
