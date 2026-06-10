import { useCallback, useEffect, useState } from "react";
import {
  api,
  type DeadzoneInfo,
  type IpResponse,
  type OledPreviewResponse,
  type StatusResponse,
} from "./api";
import { OledLivePreview } from "./components/OledLivePreview";
import { RotationModuleList } from "./components/RotationModuleList";
import {
  loadDisplayPreferences,
  saveDisplayPreferences,
  sanitizeModuleId,
  sanitizeRotationModuleIds,
  type DisplayPreferences,
  type DisplayUiMode,
} from "./display-preferences";
import type { FeatureTestInfo } from "./feature-test";
import { getOledPreviewPollIntervalMs } from "./oled-preview-poll";
import "./App.css";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("de-DE");
}

function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec} s`;
  return sec > 0 ? `${min} min ${sec} s` : `${min} min`;
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [ips, setIps] = useState<IpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadzone, setDeadzone] = useState<DeadzoneInfo | null>(null);
  const [featureTest, setFeatureTest] = useState<FeatureTestInfo | null>(null);
  const [oledPreview, setOledPreview] = useState<OledPreviewResponse | null>(
    null,
  );
  const [prefs, setPrefs] = useState<DisplayPreferences>(() =>
    loadDisplayPreferences(),
  );

  function updatePrefs(next: DisplayPreferences) {
    setPrefs(next);
    saveDisplayPreferences(next);
  }

  function setDisplayMode(mode: DisplayUiMode) {
    updatePrefs({ ...prefs, mode });
  }

  function setStartModuleId(moduleId: string) {
    updatePrefs({ ...prefs, moduleId });
  }

  function setRotationModuleIds(moduleIds: string[]) {
    updatePrefs({
      ...prefs,
      rotation: { ...prefs.rotation, moduleIds },
    });
  }

  const load = useCallback(async () => {
    try {
      const [statusData, ipData, deadzoneData, previewData, featureTestData] =
        await Promise.all([
          api.getStatus(),
          api.getIps(),
          api.getDeadzone(),
          api.getOledPreview(),
          api.getFeatureTestInfo(),
        ]);
      setStatus(statusData);
      setIps(ipData);
      setDeadzone(deadzoneData);
      setOledPreview(previewData);
      setFeatureTest(featureTestData);
      setError(null);

      const availableIds = statusData.modules.map((module) => module.id);
      setPrefs((current) => {
        const sanitized: DisplayPreferences = {
          ...current,
          moduleId: sanitizeModuleId(current.moduleId, availableIds),
          rotation: {
            ...current.rotation,
            moduleIds: sanitizeRotationModuleIds(
              current.rotation.moduleIds,
              availableIds,
            ),
          },
        };
        if (
          sanitized.moduleId !== current.moduleId ||
          sanitized.rotation.moduleIds.join(",") !==
            current.rotation.moduleIds.join(",")
        ) {
          saveDisplayPreferences(sanitized);
        }
        return sanitized;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const pollMs = oledPreview
      ? getOledPreviewPollIntervalMs(
          oledPreview.frameKind,
          oledPreview.running,
        )
      : null;
    if (!pollMs) return;

    void api.getOledPreview().then(setOledPreview).catch(() => {});

    const poll = setInterval(() => {
      void api.getOledPreview().then(setOledPreview).catch(() => {});
    }, pollMs);

    return () => clearInterval(poll);
  }, [oledPreview?.running, oledPreview?.frameKind]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      if (prefs.mode === "rotation") {
        if (prefs.rotation.moduleIds.length === 0) {
          throw new Error("Mindestens ein Modul für die Rotation auswählen");
        }
        await api.startDisplay({
          rotation: {
            moduleIds: prefs.rotation.moduleIds,
            intervalMs: prefs.rotation.intervalSec * 1000,
            eventHoldMs: prefs.rotation.eventHoldSec * 1000,
            events: prefs.rotation.onTrackChange
              ? ["media:track-changed"]
              : [],
          },
        });
      } else {
        await api.startDisplay({ moduleId: prefs.moduleId });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError(null);
    try {
      await api.stopDisplay();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      await api.refreshDisplay();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function handleFeatureTest() {
    const totalMs = featureTest?.totalMs ?? 129_000;
    setLoading(true);
    setError(null);

    try {
      await api.showFeatureTest();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Feature-Test fehlgeschlagen",
      );
    } finally {
      setLoading(false);
      setTimeout(() => void load(), totalMs + 500);
    }
  }

  const running = status?.display.running ?? false;
  const connected = status?.gameSense.connected ?? false;
  const rotationActive = status?.display.mode === "rotation";
  const rotationStatus = status?.display.rotation;

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">SteelSeries Playground</p>
          <h1>GameDAC Dashboard</h1>
          <p className="subtitle">
            Steuere die OLED-Anzeige deines Arctis Nova Pro GameDAC über GameSense.
          </p>
        </div>
        <div className={`status-pill ${connected ? "ok" : "warn"}`}>
          {connected ? "GG verbunden" : "GG offline"}
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {status?.display.lastError && (
        <div className="banner warn">{status.display.lastError}</div>
      )}

      <section className="grid">
        <article className="card">
          <h2>Verbindung</h2>
          <dl className="meta">
            <div>
              <dt>SteelSeries GG</dt>
              <dd>{connected ? "Verbunden" : "Nicht erreichbar"}</dd>
            </div>
            <div>
              <dt>API-Adresse</dt>
              <dd>{status?.gameSense.address ?? "—"}</dd>
            </div>
            <div>
              <dt>Display aktiv</dt>
              <dd>{running ? "Ja" : "Nein"}</dd>
            </div>
            <div>
              <dt>Letztes Update</dt>
              <dd>{formatTime(status?.display.lastUpdate ?? null)}</dd>
            </div>
          </dl>
        </article>

        <article className="card oled-card">
          <h2>Live-Ansicht</h2>
          {oledPreview ? (
            <OledLivePreview preview={oledPreview} />
          ) : (
            <p className="hint">OLED-Vorschau wird geladen…</p>
          )}
          {oledPreview?.frameKind === "media" && oledPreview.media ? (
            <dl className="oled-ip-meta">
              <div>
                <dt>Titel</dt>
                <dd>{oledPreview.media.title || "—"}</dd>
              </div>
              <div>
                <dt>Interpret</dt>
                <dd>{oledPreview.media.artist || "—"}</dd>
              </div>
              {oledPreview.media.timeline ? (
                <div>
                  <dt>Zeit</dt>
                  <dd>{oledPreview.media.timeline}</dd>
                </div>
              ) : null}
              <div>
                <dt>App</dt>
                <dd>{oledPreview.media.appLabel || "—"}</dd>
              </div>
            </dl>
          ) : (
            <dl className="oled-ip-meta">
              <div>
                <dt>LAN</dt>
                <dd>{ips?.lan ?? oledPreview?.lan ?? "—"}</dd>
              </div>
              <div>
                <dt>WAN</dt>
                <dd>{ips?.wan ?? oledPreview?.wan ?? "—"}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="card wide">
          <h2>Steuerung</h2>

          <div className="display-mode-row">
            <span className="display-mode-label">Anzeige-Modus</span>
            <div className="display-mode-options">
              <label className="mode-option">
                <input
                  type="radio"
                  name="display-mode"
                  value="single"
                  checked={prefs.mode === "single"}
                  onChange={() => setDisplayMode("single")}
                  disabled={loading || running}
                />
                Einzelmodul
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="display-mode"
                  value="rotation"
                  checked={prefs.mode === "rotation"}
                  onChange={() => setDisplayMode("rotation")}
                  disabled={loading || running}
                />
                Rotation
              </label>
            </div>
          </div>

          {prefs.mode === "single" ? (
            <div className="module-row">
              <label htmlFor="module">Anzeige-Modul</label>
              <select
                id="module"
                value={prefs.moduleId}
                onChange={(e) => setStartModuleId(e.target.value)}
                disabled={loading || running}
              >
                {(status?.modules ?? []).map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rotation-panel">
              <p className="section-title">Module in der Rotation</p>
              <RotationModuleList
                modules={status?.modules ?? []}
                selectedIds={prefs.rotation.moduleIds}
                disabled={loading || running}
                onChange={setRotationModuleIds}
              />

              <div className="rotation-settings">
                <label className="rotation-setting">
                  <span>Wechsel alle (Sek.)</span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={prefs.rotation.intervalSec}
                    onChange={(e) =>
                      updatePrefs({
                        ...prefs,
                        rotation: {
                          ...prefs.rotation,
                          intervalSec: Math.max(
                            5,
                            Number(e.target.value) || 15,
                          ),
                        },
                      })
                    }
                    disabled={loading || running}
                  />
                </label>
                <label className="rotation-setting">
                  <span>Event-Anzeige (Sek.)</span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={prefs.rotation.eventHoldSec}
                    onChange={(e) =>
                      updatePrefs({
                        ...prefs,
                        rotation: {
                          ...prefs.rotation,
                          eventHoldSec: Math.max(
                            5,
                            Number(e.target.value) || 15,
                          ),
                        },
                      })
                    }
                    disabled={loading || running}
                  />
                </label>
              </div>

              <label className="rotation-event-option">
                <input
                  type="checkbox"
                  checked={prefs.rotation.onTrackChange}
                  onChange={(e) =>
                    updatePrefs({
                      ...prefs,
                      rotation: {
                        ...prefs.rotation,
                        onTrackChange: e.target.checked,
                      },
                    })
                  }
                  disabled={loading || running}
                />
                <span>Bei neuem Song → Now Playing priorisieren</span>
              </label>
            </div>
          )}

          {running && rotationActive && rotationStatus ? (
            <p className="hint rotation-status">
              Rotation aktiv:{" "}
              {rotationStatus.moduleIds
                .map(
                  (id) =>
                    status?.modules.find((module) => module.id === id)?.name ??
                    id,
                )
                .join(" → ")}{" "}
              ({rotationStatus.intervalMs / 1000} s) — aktuell{" "}
              {status?.modules.find(
                (module) => module.id === rotationStatus.currentModuleId,
              )?.name ?? rotationStatus.currentModuleId}
            </p>
          ) : null}

          <div className="controls">
            <button
              type="button"
              className="primary"
              onClick={() => void handleStart()}
              disabled={loading || running || !connected}
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => void handleStop()}
              disabled={loading || !running}
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading || !running}
            >
              Jetzt aktualisieren
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void handleFeatureTest()}
              disabled={loading || !running}
            >
              Feature-Test
            </button>
          </div>

          {deadzone && featureTest && (
            <p className="hint deadzone-hint">
              Geräteansicht {deadzone.drawable.width}×
              {deadzone.drawable.height}px (gesendet {deadzone.screen.width}×
              {deadzone.screen.height}px) — max. {deadzone.deviceVisibleTextLines}{" "}
              Textzeilen à {deadzone.lineHeight}px. Feature-Test (
              {formatDurationMs(featureTest.totalMs)}, {featureTest.phaseCount}{" "}
              Phasen): Pixel-Check → Zeilen → Deadzone → Progressbar → Gauge →
              Volume → Sparkline → Uhr → Status → EQ → Spinner → Marquee →
              7-Segment — danach IP-Anzeige.
            </p>
          )}

        </article>
      </section>
    </div>
  );
}
