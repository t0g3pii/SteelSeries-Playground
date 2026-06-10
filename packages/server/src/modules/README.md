# Display-Module

Jedes Modul steuert, **was** auf dem GameDAC-OLED angezeigt wird. Die OLED-Bausteine (Gauge, Uhr, Text, …) liegen in `../oled/` — Module kombinieren diese zu einer Anzeige.

## Neues Modul anlegen

1. `template-module.ts` kopieren und umbenennen (z. B. `weather-module.ts`).
2. `id`, `name` und `getFrame()` anpassen.
3. In `registry.ts` registrieren: `this.register(new WeatherModule())`.
4. Optional: `supportsRotation`, `getModuleData`, `pollRotationEvent` implementieren.

## Interface (`types.ts`)

| Feld | Pflicht | Beschreibung |
|------|---------|--------------|
| `id` | ja | Eindeutige ID für API und UI |
| `name` | ja | Anzeigename im Dashboard |
| `getFrame()` | ja | Liefert den nächsten OLED-Frame |
| `getScreenHandlers()` | ja | GameSense Screen-Handler (meist Bitmap) |
| `preferredRefreshIntervalMs` | nein | Refresh-Rate beim Aktivieren |
| `getFrameKind()` | nein | Vorschau-Typ für die Web-UI |
| `getModuleData()` | nein | Daten für `GET /api/modules/:id` |
| `rotationSettings` | nein | UI-Metadaten für Zahnrad-Popup in der Rotation |
| `pollRotationEvent()` | nein | Events für Rotations-Unterbrechung |

## Rotation

Mehrere Module können im Dashboard als Warteschlange konfiguriert werden. Der `DisplayManager` tickt **1×/s** (`ROTATION_TICK_INTERVAL_MS`): Events pollen, Slot wechseln, Frames nur bei Bedarf senden.

- **`staticFrame: true`** (z. B. IP): Frame einmal beim Aktivieren, danach nur Heartbeat.
- **Dynamische Module** (Medien, Uhr): weiter 1×/s aktualisieren.

Events (z. B. `media:track-changed`, `template:full-hour`) werden pro Modul im Dashboard (⚙) aktiviert und priorisieren das Modul für `eventHoldMs`.

## API

- `GET /api/modules` — alle registrierten Module
- `GET /api/modules/:id` — Modul-Daten (wenn `getModuleData` vorhanden)
- `POST /api/display/start` — Einzelmodul `{ moduleId }` oder Rotation `{ rotation: { moduleIds, intervalMs, eventHoldMs, events } }`
