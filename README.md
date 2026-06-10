# SteelSeries Playground

Steuere die OLED-Anzeige deines **Arctis Nova Pro Wireless GameDAC** über eine lokale Web-UI — powered by [SteelSeries GameSense](https://github.com/SteelSeries/gamesense-sdk).

Zeig LAN/WAN-IPs, Now Playing von Spotify & Co., oder baue eigene Module mit der OLED Component API. Alles läuft lokal auf deinem PC, ohne Cloud.

---

## Features

- **Web-Dashboard** — Live-Vorschau des OLED-Inhalts, Start/Stop, Einstellungen werden im Browser gespeichert
- **Display-Module** — IP-Anzeige, Now Playing (Windows Media Session), Template-Uhr; erweiterbar per Plugin
- **Einzelmodul oder Rotation** — Module nacheinander anzeigen, Reihenfolge per Drag & Drop
- **Modul-Events** — z. B. bei neuem Song Now Playing priorisieren, zur vollen Stunde die Uhr (⚙ pro Modul)
- **Live-Umstellung** — Modus, Module und Rotation während des Laufens ändern, ohne Neustart
- **OLED Component API** — wiederverwendbare Bausteine (Gauge, Uhr, Marquee, …) für eigene Frames

---

## Schnellstart

### Voraussetzungen

| | |
|---|---|
| OS | Windows 10/11 |
| Node.js | **20 LTS** (siehe `.nvmrc`) |
| Software | [SteelSeries GG](https://steelseries.com/gg) läuft |
| Hardware | GameDAC verbunden |
| GameSense | `%ProgramData%\SteelSeries\SteelSeries Engine 3\coreProps.json` existiert |

### Installation

```powershell
# Mit nvm-windows (empfohlen)
nvm install 20
nvm use 20
npm install
```

Ohne nvm: [Node.js 20 LTS](https://nodejs.org/) installieren, dann `npm install` im Repo-Root.

> **nvm-Hinweis:** Das npm-Paket `nvm` ist *nicht* nvm-windows. Bei der Meldung *„This is not the package you are looking for“* direkt `nvm.exe` aus `%LOCALAPPDATA%\nvm\` nutzen.

### Starten

```bash
npm run dev
```

| Dienst | URL |
|--------|-----|
| Web-UI (Entwicklung) | http://localhost:5173 |
| API-Server | http://localhost:3000 |

Im Dashboard **Start** klicken — die Anzeige erscheint auf dem GameDAC. Unter **GameSense Apps** in GG sollte `GAMEDAC_DASHBOARD` sichtbar sein.

### Produktion

```bash
npm run build
npm start
```

Web-UI und API laufen dann gemeinsam unter http://localhost:3000.

---

## Dashboard

| Bereich | Funktion |
|---------|----------|
| **Live-Ansicht** | 128×52-Geräteansicht + Modul-Metadaten (Titel, IPs, Uhrzeit, …) |
| **Einzelmodul** | Ein Modul dauerhaft anzeigen; Wechsel auch während des Laufens |
| **Rotation** | Mehrere Module in Reihenfolge; Wechsel-Intervall und Event-Dauer einstellbar |
| **Modul-⚙** | Pro-Modul-Einstellungen (Events, Priorisierung) im Popup |
| **Feature-Test** | OLED-Demo-Sequenz — belastet das DAC stark, nur zum Testen |

Einstellungen (Modus, Module, Rotation, Events) werden in `localStorage` gehalten und beim Laden mit dem laufenden Server abgeglichen.

---

## Eingebaute Module

| ID | Name | Kurzbeschreibung |
|----|------|------------------|
| `ip` | IP-Anzeige | LAN- und WAN-IP (statisch in Rotation, 1 Frame pro Slot) |
| `media` | Now Playing | Titel, Artist, App-Icon, Zeit — Spotify, Jellyfin, … via Windows GSMTC |
| `template` | Template (Uhr) | Beispiel-Modul / Vorlage für eigene Anzeigen |

Neues Modul: [`packages/server/src/modules/README.md`](packages/server/src/modules/README.md) und `template-module.ts`.

---

## Projektstruktur

```
SteelSeries-Playground/
├── packages/
│   ├── server/                 # Express API + GameSense + OLED-Rendering
│   │   └── src/
│   │       ├── routes/         # REST: display, modules, oled
│   │       ├── modules/        # Display-Module (Plugins)
│   │       ├── oled/           # Frame-Builder, Layout, Fonts
│   │       └── display/        # DisplayManager, Rotation
│   └── web/                    # React-Dashboard (Vite)
├── docs/
│   └── OLED-API.md             # Frame-Builder-Referenz
└── .cursor/rules/
    └── oled-layout.mdc         # Layout-Vertrag für Agents
```

---

## API (Überblick)

Basis-URL: `http://localhost:3000/api`

### Display

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/status` | GG-Verbindung, Display-Status, Modulliste |
| POST | `/display/start` | Starten: `{ moduleId }` oder `{ rotation: { … } }` |
| POST | `/display/stop` | Anzeige stoppen |
| POST | `/display/configure` | Live: Modus, Rotation oder Modul ändern |
| POST | `/display/switch` | Live: anderes Modul (Einzelmodus) |
| GET | `/display/preview` | OLED-Bitmap + Metadaten für die Web-UI |

**Rotation-Body (Beispiel):**

```json
{
  "rotation": {
    "moduleIds": ["ip", "media", "template"],
    "intervalMs": 15000,
    "eventHoldMs": 15000,
    "events": ["media:track-changed"]
  }
}
```

Events werden aus den Modul-Einstellungen (⚙) abgeleitet. Verfügbar u. a.: `media:track-changed`, `template:full-hour`.

### Module & OLED

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/modules` | Registrierte Module inkl. `rotationSettings` |
| GET | `/modules/:id` | Modul-Daten (z. B. Now Playing, IPs) |
| GET | `/oled/components` | Verfügbare UI-Komponenten (Discovery) |

Weitere Test-Endpunkte (`/display/feature-test`, …) siehe `packages/server/src/routes/display.ts`.

---

## OLED & Layout

Am **Arctis Nova Pro Wireless GameDAC** gemessen — **nicht ändern** ohne erneute Hardware-Messung.

| | Maß |
|---|-----|
| Gesendet (GameSense) | **128×64** |
| Sichtbar auf dem Gerät | **128×52** (Y = 0…51) |
| Text | 6×8-Font, max. 6 Zeilen, 2 px Padding oben/unten |

- Layout-Vertrag: `packages/server/src/oled/layout-contract.ts`
- Frame-Builder: [`docs/OLED-API.md`](docs/OLED-API.md) · Einstieg: `packages/server/src/oled/api.ts`
- Umlaute: Bitmap nur ASCII → `ä/ö/ü` werden als `ae/oe/ue` gerendert; Web-UI zeigt UTF-8

**Bitmap-Modus** (Standard) nutzt eine lokale Display-Klasse (abgeleitet von [steelseries-screen-controller](https://github.com/Aidan647/SteelSeries-Screen-Controller)) und [oled-font-pack](https://www.npmjs.com/package/oled-font-pack).

Text-Fallback (größere GG-Systemschrift):

```bash
set DISPLAY_MODE=text
npm start
```

> Node **20 LTS** empfohlen — `steelseries-screen-controller` (native Binaries) ist unter Node 24 problematisch.

---

## Troubleshooting

<details>
<summary><strong>„GG offline“ / coreProps.json fehlt</strong></summary>

- SteelSeries GG vollständig starten lassen
- Prüfen: `%ProgramData%\SteelSeries\SteelSeries Engine 3\coreProps.json`
</details>

<details>
<summary><strong>OLED bleibt leer</strong></summary>

- GameDAC verbunden?
- In der Web-UI **Start** geklickt?
- GG neu starten, erneut **Start** (GameSense-Handler werden neu gebunden)
- Unter **GameSense Apps** muss `GAMEDAC_DASHBOARD` erscheinen
</details>

<details>
<summary><strong>Now Playing zeigt nichts / falsche Zeichen</strong></summary>

- Windows muss eine aktive Medien-Session haben (Spotify, Jellyfin, …)
- Umlaute auf dem DAC: Transliteration (`Wuerdest` statt `Würdest`) — Font-Limitation
- Web-Meta sollte korrekte UTF-8-Titel zeigen
</details>

<details>
<summary><strong>Rotation / Events reagieren nicht</strong></summary>

- Modul per ⚙ konfiguriert und Event aktiviert?
- `media` bzw. `template` muss in der Rotations-Liste stehen
- Server-Log / `lastError` im Dashboard prüfen
</details>

---

## Entwicklung

```bash
npm run dev      # Server + Web mit Hot Reload
npm run build    # TypeScript + Vite Production Build
```

| Workspace | Package | Beschreibung |
|-----------|---------|--------------|
| `packages/server` | `@gamedac/server` | API, GameSense-Client, Module |
| `packages/web` | `@gamedac/web` | React-Dashboard |

**Neues Display-Modul:** `template-module.ts` kopieren → in `registry.ts` registrieren → optional `rotationSettings` + `pollRotationEvent`.

**Neuer OLED-Baustein:** Builder in `packages/server/src/oled/` — in [`docs/OLED-API.md`](docs/OLED-API.md) dokumentieren und über `oled/api.ts` exportieren.

---

## Lizenz

MIT
