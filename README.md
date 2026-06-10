# GameDAC Dashboard

Lokale Web-Plattform zur Steuerung der OLED-Anzeige auf dem SteelSeries Arctis Nova Pro Wireless GameDAC über die [GameSense API](https://github.com/SteelSeries/gamesense-sdk).

## Voraussetzungen

- Windows 10/11
- [Node.js](https://nodejs.org/) **20 LTS** (empfohlen, siehe `.nvmrc`)
- [SteelSeries GG](https://steelseries.com/gg) läuft
- GameDAC ist verbunden
- `coreProps.json` existiert unter:
  `%ProgramData%\SteelSeries\SteelSeries Engine 3\coreProps.json`

## Installation

**Windows — [nvm-windows](https://github.com/coreybutler/nvm-windows)** (nicht das npm-Paket `nvm`!):

```powershell
nvm install 20
nvm use 20
node --version   # sollte v20.x zeigen
npm install
```

Falls `nvm` die Meldung *„This is not the package you are looking for“* zeigt, ist das falsche npm-Paket im PATH. Dann direkt:

```powershell
& "$env:LOCALAPPDATA\nvm\nvm.exe" install 20
& "$env:LOCALAPPDATA\nvm\nvm.exe" use 20
```

Optional das Störpaket entfernen: `npm uninstall -g nvm`

**Ohne nvm:** [Node.js 20 LTS](https://nodejs.org/) installieren, dann `npm install`.

## Entwicklung starten

```bash
npm run dev
```

Das startet:

- **API-Server** auf `http://localhost:3000`
- **Web-UI** auf `http://localhost:5173` (mit API-Proxy)

Öffne die Web-UI im Browser, klicke auf **Start**, und die LAN-/WAN-IP erscheint auf dem GameDAC-OLED.

## Produktion

```bash
npm run build
npm start
```

Die gebaute Web-UI wird dann vom API-Server unter `http://localhost:3000` ausgeliefert.

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/status` | Verbindungs- und Display-Status |
| POST | `/api/display/start` | Start: `{ moduleId }` oder `{ rotation: { moduleIds, intervalMs, eventHoldMs, events } }` |
| POST | `/api/display/stop` | OLED-Aktualisierung stoppen |
| POST | `/api/display/refresh` | Sofort aktualisieren |
| GET | `/api/modules` | Alle registrierten Display-Module |
| GET | `/api/modules/:id` | Modul-Daten (z. B. `ip`, `media`) |
| GET | `/api/oled/components` | Verfügbare OLED-UI-Komponenten (Discovery) |
| GET | `/api/display/feature-test` | Feature-Test-Dauer und Phasen |
| POST | `/api/display/feature-test` | Komplette OLED-Demo-Sequenz starten |

## Troubleshooting

### „GG offline“ / coreProps.json nicht gefunden

- SteelSeries GG starten und warten, bis es vollständig geladen ist
- Prüfen, ob `%ProgramData%\SteelSeries\SteelSeries Engine 3\coreProps.json` existiert

### OLED zeigt nichts an

- GameDAC muss verbunden sein
- In SteelSeries GG unter **GameSense Apps** sollte `GAMEDAC_DASHBOARD` erscheinen
- Auf **Start** in der Web-UI klicken
- GG ggf. neu starten und erneut **Start** klicken (Handler muss neu gebunden werden)

### IPs ändern sich nicht

- Das IP-Modul nutzt `value_optional: true`, damit auch gleichbleibende Werte aktualisiert werden
- **Jetzt aktualisieren** erzwingt ein sofortiges Update

## Architektur

```
packages/server
  src/routes/     REST-API (display, modules, oled)
  src/modules/    Display-Module / Plugins (ip, media, template, …)
  src/oled/       OLED Component API (Frame-Builder, Layout)
  src/display/    DisplayManager + Rotation
packages/web      React Dashboard (Einstellungen in localStorage)
```

Neue Anzeige-Module: `packages/server/src/modules/README.md` und `template-module.ts` als Vorlage.  
OLED-Bausteine für Module: `docs/OLED-API.md` und `packages/server/src/oled/api.ts`.

### OLED Layout Contract (verbindlich)

Empirisch am **Arctis Nova Pro Wireless GameDAC** gemessen (Pixel-Checker, Zeilen-Test, Deadzone-Ecken). **Nicht ändern** ohne erneute Hardware-Messung.

| | Maße |
|---|---|
| **Gesendet** (GameSense) | **128×64** (`image-data-128x64`) |
| **Sichtbar** (Gerät & Live-Ansicht) | **128×52** (Y=0…51) |
| **Text-Padding** | 2px oben + unten |
| **Max. Textzeilen** | 6 (6×8-Font) |

Single Source of Truth: `packages/server/src/oled/layout-contract.ts`  
Layout-Helfer: `packages/server/src/oled/deadzone.ts`

**OLED Component API** (Frame-Builder für Module & Features): [`docs/OLED-API.md`](docs/OLED-API.md)  
Einstieg im Code: `packages/server/src/oled/api.ts`

Dashboard: **Feature-Test** (Pixel-Check, Zeilen, Deadzone, Progressbar, Gauge, alle UI-Komponenten)

### OLED-Rendering

Standard: **Bitmap** (6×8-Font, Display-Logik aus [steelseries-screen-controller](https://github.com/Aidan647/SteelSeries-Screen-Controller), Font-Glyphen aus [oled-font-pack](https://www.npmjs.com/package/oled-font-pack)). GameSense erhält 128×64; Layout und Geräteansicht halten sich an den **128×52**-Vertrag oben. Zusätzlich `image-data-128x52` für Legacy-GameDAC.

Fallback auf GameSense-Text (größere Systemschrift):

```bash
set DISPLAY_MODE=text
npm start
```

Die LAN-IP bevorzugt Ethernet vor WLAN und ignoriert Tailscale/VPN-Adressen (100.64.0.0/10).

> **Hinweis:** Das npm-Paket `steelseries-screen-controller` benötigt native `node-libpng`-Binaries und läuft nicht unter Node 24. Deshalb ist die Display-Klasse lokal eingebunden; das Rendering ist identisch. Node 20 LTS wird für Stabilität empfohlen.

## Lizenz

MIT
