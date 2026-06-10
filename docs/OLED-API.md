# OLED Component API

Öffentliche API zum Erzeugen von GameSense-Bitmap-Frames für das Arctis Nova Pro Wireless GameDAC.

**Einstiegspunkt im Code:** `packages/server/src/oled/api.ts`

Alle Feature-Test-Komponenten (Progressbar, Gauge, Volume, …) sind darüber als wiederverwendbare `build*Frame()`-Funktionen verfügbar.

---

## Schnellstart

### In einem Display-Modul

```typescript
import type { DisplayModule, DisplayFrame } from "./types.js";
import { buildGaugeFrame, clampProgressPercent } from "../oled/api.js";

export class CpuModule implements DisplayModule {
  id = "cpu";
  name = "CPU-Auslastung";

  async getFrame(): Promise<DisplayFrame> {
    const percent = await this.readCpuPercent();
    return buildGaugeFrame(clampProgressPercent(percent));
  }

  getScreenHandlers() {
    return getBitmapScreenHandlers(); // aus api.ts
  }
}
```

### Einzelnen Frame senden (DisplayManager)

Der `DisplayManager` erwartet dasselbe Format wie `getFrame()` — ein `DisplayFrame` mit mindestens dem Key `image-data-128x64`:

```typescript
import { buildProgressBarFrame } from "../oled/api.js";

const frame = buildProgressBarFrame(73);
await displayManager.sendFrame(frame); // intern, falls exponiert
```

---

## Frame-Format

| Typ | Beschreibung |
|-----|--------------|
| `OledBitmapFrame` | `Record<string, number[]>` — Screen-Key → gepackte Bitmap-Bytes |
| `DisplayFrame` | Alias für Module; Werte können `string` (Text-Modus) oder `number[]` (Bitmap) sein |

Bitmap-Frames enthalten **beide** Keys für Abwärtskompatibilität:

- `image-data-128x64` — Nova Pro (128×64 gesendet, 128×52 sichtbar)
- `image-data-128x52` — Legacy-GameDAC

Konstante: `IMAGE_DATA_KEY` → primärer Key.

---

## Layout-Vertrag (nicht brechen)

| | Wert |
|---|---|
| Gesendet | 128×64 |
| Sichtbar | 128×52 (Y = 0…51) |
| Text-Padding | 2 px oben + unten |
| Max. Textzeilen | 6 (6×8-Font) |

```typescript
import {
  OLED_LAYOUT_CONTRACT,
  maxTextLines,
  lineTopOffset,
  contentPadding,
} from "../oled/api.js";
```

Details: `packages/server/src/oled/layout-contract.ts` und `.cursor/rules/oled-layout.mdc`.

---

## UI-Komponenten

Jede Komponente liefert ein fertiges `OledBitmapFrame`. Prozent-/Level-Werte werden intern geklemmt, wo angegeben.

### Progressbar

```typescript
import {
  buildProgressBarFrame,
  clampProgressPercent,
  PROGRESS_BAR_TRACK_PX, // 100 → 1 px = 1 %
} from "../oled/api.js";

buildProgressBarFrame(42);           // 42 %
buildProgressBarFrame(clampProgressPercent(n));
```

### Gauge (Halbkreis-Ring)

```typescript
import {
  buildGaugeFrame,
  GAUGE_INNER_RADIUS_PX,  // 20 (hardware-verifiziert)
  GAUGE_OUTER_RADIUS_PX,  // 36
} from "../oled/api.js";

buildGaugeFrame(75);
```

### Volume-Balken

```typescript
import {
  buildVolumeBarsFrame,
  VOLUME_SEGMENT_COUNT, // 12 Segmente
} from "../oled/api.js";

buildVolumeBarsFrame(8); // 8 von 12 Segmenten gefüllt
```

### Sparkline

```typescript
import { buildSparklineFrame } from "../oled/api.js";

// Werte 0–1 (normalisiert), z. B. Ping-Verlauf
const samples = [0.2, 0.5, 0.8, 0.4, 0.6];
buildSparklineFrame(samples);
```

### Uhr

```typescript
import { buildClockFrame } from "../oled/api.js";

buildClockFrame();              // jetzt
buildClockFrame(new Date());    // explizit
```

### Status-Kachel

```typescript
import {
  buildStatusTileFrame,
  STATUS_TILE_VARIANTS,
  type StatusTileVariant,
} from "../oled/api.js";

buildStatusTileFrame("mic-on");
buildStatusTileFrame("gg-ok");
buildStatusTileFrame("bt");
buildStatusTileFrame("warn");
```

### Equalizer

```typescript
import { buildEqualizerFrame, EQ_BAR_COUNT } from "../oled/api.js";

// 9 Balken, Höhe 0–100 %
buildEqualizerFrame([10, 40, 80, 50, 90, 30, 60, 70, 20]);
```

### Spinner

```typescript
import { buildSpinnerFrame, SPINNER_RADIUS_PX } from "../oled/api.js";

// frameIndex hochzählen (z. B. alle 100 ms) für Animation
buildSpinnerFrame(tick);
```

### Marquee

```typescript
import {
  buildMarqueeFrame,
  MARQUEE_TEXT,
} from "../oled/api.js";

// pixelOffset pro Tick erhöhen (1 px = flüssiger Scroll)
buildMarqueeFrame(scrollPx);
```

### 7-Segment

```typescript
import { buildSevenSegmentFrame } from "../oled/api.js";

buildSevenSegmentFrame(42);   // "042"
buildSevenSegmentFrame(100);  // "100"
```

### Now Playing (Medien)

```typescript
import { buildMediaFrame } from "../oled/api.js";
import { queryWindowsMediaSession } from "../windows/media-session.js";

const session = await queryWindowsMediaSession();
buildMediaFrame({ session, scrollTick: 0 });
```

Layout: **40×40 App-Icon** links ohne Rahmen (Spotify mit drei Schallwellen, Chrome, Firefox, Opera, VLC, Jellyfin, Edge, Fallback), **Titel** und **Interpret** rechts, optional **Zeit** (`mm:ss/mm:ss`) nur bei **Spotify** und **Jellyfin** — 3. Zeile (mit Artist) bzw. 2. Zeile (ohne Artist). Lange Texte scrollen als Marquee (geclippt, **6 px/s**, 1 Update/s). Windows-Abfrage inkl. Timeline via `packages/server/scripts/query-windows-media.ps1`. **Umlaute:** 6×8-Font nur ASCII — Bitmap-Rendering nutzt `sanitizeOledText()` (ä→ae, ö→oe, ü→ue); API/Web behalten Original-UTF-8.

Display-Modul: `MediaModule` (`id: "media"`) — **1×/s** (OLED, GSMTC, Marquee). Zeit: lokaler **+1 s/Tick**; API-Sync bei Trackwechsel/Pause, Zurückspulen (≥1 s) oder >10 s Rückstand.

---

## Komponenten-Registry

Programmatische Übersicht aller UI-Builder:

```typescript
import { OLED_UI_COMPONENTS } from "../oled/api.js";

for (const [key, component] of Object.entries(OLED_UI_COMPONENTS)) {
  console.log(key, component.label, component.params);
  // component.build(...) — gleiche Signatur wie oben
}
```

HTTP (Discovery):

```
GET /api/oled/components
```

Antwort: Liste mit `key`, `id`, `label`, `params` (ohne `build`-Funktion).

---

## Produktions-Frames

| Funktion | Zweck |
|----------|--------|
| `buildImageFrame(lan, wan)` | IP-Anzeige (2 Zeilen, Bitmap) |
| `buildOfflineFrame()` | „Display aus“-Screen |
| `buildTextFrame(lan, wan)` | Text-Payload für GameSense-Text-Modus |

Handler für GameSense-Bindung:

- `getBitmapScreenHandlers()` — Bitmap (Standard)
- `getTextScreenHandlers()` — Text-Fallback

---

## Diagnose-Frames (Layout-Tests)

| Funktion | Zweck |
|----------|--------|
| `buildPixelCheckFrame(inverted, countdown)` | Pixel-Checker mit Countdown |
| `buildLineTestFrame(lineCount?)` | Zeilen-Test (default: max. Zeilen) |
| `buildDeadzoneTestFrame()` | Ecken bei (0,0) und (127,51) |

Werden vom **Feature-Test** (`POST /api/display/feature-test`) durchlaufen.

---

## Eigene Komponenten bauen

### Variante A — `Display`-Klasse (Low-Level)

```typescript
import {
  Display,
  OledFont,
  buildBitmapFrame,
  contentPadding,
  deviceVisibleHeight,
} from "../oled/api.js";

export function buildMyFrame(): OledBitmapFrame {
  return buildBitmapFrame((width, height) => {
    const display = new Display(width, height);
    const font = OledFont.loadSmall6x8();

    display.drawText({
      x: 0,
      y: contentPadding(height),
      text: "Hallo",
      font,
      color: 1,
    });

    return display.get();
  });
}
```

### Variante B — Helfer

```typescript
import { fillRect, drawBitmapIcon } from "../oled/api.js";
```

`buildBitmapFrame()` erzeugt automatisch Einträge für alle `OLED_SCREENS` (64 + 52).

---

## Feature-Test-Sequenz

Konfiguration: `packages/server/src/oled/feature-test.ts`

```
GET  /api/display/feature-test   → totalMs, phaseCount, components
POST /api/display/feature-test   → startet komplette Demo-Sequenz
```

Phasen: Pixel-Check → Zeilen → Deadzone → Progressbar → Gauge → alle 8 UI-Komponenten.

Einzeltests (weiterhin per API, ohne UI-Button):

```
POST /api/display/component-test   { "id": "spinner" }
POST /api/display/progress-bar-test
POST /api/display/gauge-test
```

---

## Datei-Übersicht

| Pfad | Rolle |
|------|--------|
| `oled/api.ts` | **Öffentliche API** — hier importieren |
| `oled/layout-contract.ts` | Verbindliche Layout-Werte |
| `oled/deadzone.ts` | Layout-Helfer |
| `oled/frame-pack.ts` | `buildBitmapFrame`, `packBitmap` |
| `oled/progress-bar.ts` | Progressbar-Builder |
| `oled/gauge.ts` | Gauge-Builder |
| `oled/volume-bars.ts` | Volume-Builder |
| `oled/sparkline.ts` | Sparkline-Builder |
| `oled/clock.ts` | Uhr-Builder |
| `oled/status-tile.ts` | Status-Kachel-Builder |
| `oled/equalizer.ts` | Equalizer-Builder |
| `oled/spinner.ts` | Spinner-Builder |
| `oled/marquee.ts` | Marquee-Builder |
| `oled/seven-segment.ts` | 7-Segment-Builder |
| `oled/renderer.ts` | IP-/Offline-Frames |
| `oled/component-tests.ts` | Test-Scheduler (intern) |
| `display/feature-test-runner.ts` | Feature-Test-Orchestrierung |

---

## Checkliste für neue Module

1. Von `../oled/api.js` importieren, nicht aus Einzeldateien (außer du erweiterst die API bewusst).
2. `getFrame()` gibt `DisplayFrame` / `OledBitmapFrame` zurück.
3. Nur innerhalb **128×52** zeichnen; `lineTopOffset` / `contentPadding` nutzen.
4. Prozentwerte mit `clampProgressPercent()` normalisieren.
5. Hardware mit Feature-Test oder Einzel-`component-test` verifizieren.
