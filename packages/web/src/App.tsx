import { useCallback, useEffect, useState } from "react";
import {
  api,
  type OledPreviewResponse,
  type StartDisplayBody,
  type StatusResponse,
} from "./api";
import { FlipSwitch } from "./components/FlipSwitch";
import { OledLivePreview } from "./components/OledLivePreview";
import { OledPreviewMeta } from "./components/OledPreviewMeta";
import { RotationModuleList } from "./components/RotationModuleList";
import {
  loadDisplayPreferences,
  prefsFromRunningDisplay,
  saveDisplayPreferences,
  sanitizeModuleId,
  sanitizeRotationModuleIds,
  type DisplayPreferences,
  type DisplayUiMode,
} from "./display-preferences";
import type { FeatureTestInfo } from "./feature-test";
import {
  ensureModuleSettings,
  rotationEventsFromModuleSettings,
} from "./module-rotation-settings";
import { getOledPreviewPollIntervalMs } from "./oled-preview-poll";
import "./App.css";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("de-DE");
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  function displayBodyFromPrefs(
    next: DisplayPreferences,
    modules = status?.modules ?? [],
  ): StartDisplayBody {
    if (next.mode === "rotation") {
      return {
        rotation: {
          moduleIds: next.rotation.moduleIds,
          intervalMs: next.rotation.intervalSec * 1000,
          eventHoldMs: next.rotation.eventHoldSec * 1000,
          events: rotationEventsFromModuleSettings(
            next.rotation.moduleIds,
            next.rotation.moduleSettings,
            modules,
          ),
        },
      };
    }
    return { moduleId: next.moduleId };
  }

  async function applyDisplayConfig(next: DisplayPreferences) {
    if (next.mode === "rotation" && next.rotation.moduleIds.length === 0) {
      throw new Error("Mindestens ein Modul für die Rotation auswählen");
    }
    await api.configureDisplay(displayBodyFromPrefs(next));
    await load();
  }

  async function handleDisplayModeChange(mode: DisplayUiMode) {
    const previous = prefs;
    const next = { ...prefs, mode };
    updatePrefs(next);

    if (!running) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await applyDisplayConfig(next);
    } catch (err) {
      updatePrefs(previous);
      setError(
        err instanceof Error ? err.message : "Moduswechsel fehlgeschlagen",
      );
    } finally {
      setLoading(false);
    }
  }

  async function commitRotationPrefs(
    rotation: DisplayPreferences["rotation"],
    previous = prefs,
  ) {
    if (rotation.moduleIds.length === 0) {
      throw new Error("Mindestens ein Modul für die Rotation auswählen");
    }

    const next = { ...prefs, rotation };
    updatePrefs(next);

    if (!running || prefs.mode !== "rotation") {
      return;
    }

    setError(null);
    try {
      await api.configureDisplay(displayBodyFromPrefs(next));
      const statusData = await api.getStatus();
      setStatus(statusData);
      saveDisplayPreferences(next);
    } catch (err) {
      updatePrefs(previous);
      throw err;
    }
  }

  async function handleRotationModuleIdsChange(moduleIds: string[]) {
    if (moduleIds.length === 0) {
      setError("Mindestens ein Modul in der Rotation");
      return;
    }

    const moduleSettings = ensureModuleSettings(
      moduleIds,
      prefs.rotation.moduleSettings,
      status?.modules ?? [],
    );

    try {
      await commitRotationPrefs({
        ...prefs.rotation,
        moduleIds,
        moduleSettings,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Rotation fehlgeschlagen",
      );
    }
  }

  async function handleModuleSettingsChange(
    moduleId: string,
    settings: Record<string, boolean>,
  ) {
    try {
      await commitRotationPrefs({
        ...prefs.rotation,
        moduleSettings: {
          ...prefs.rotation.moduleSettings,
          [moduleId]: settings,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Einstellungen fehlgeschlagen",
      );
    }
  }

  async function handleRotationTimingBlur() {
    if (!running || prefs.mode !== "rotation") {
      return;
    }

    try {
      await commitRotationPrefs(prefs.rotation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Rotation fehlgeschlagen",
      );
    }
  }

  const load = useCallback(async () => {
    try {
      const [statusData, previewData, featureTestData] = await Promise.all([
        api.getStatus(),
        api.getOledPreview(),
        api.getFeatureTestInfo(),
      ]);
      setStatus(statusData);
      setOledPreview(previewData);
      setFeatureTest(featureTestData);
      setError(null);

      const availableIds = statusData.modules.map((module) => module.id);
      setPrefs((current) => {
        let next = {
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

        next = {
          ...next,
          rotation: {
            ...next.rotation,
            moduleSettings: ensureModuleSettings(
              next.rotation.moduleIds,
              next.rotation.moduleSettings,
              statusData.modules,
            ),
          },
        };

        if (statusData.display.running) {
          next = prefsFromRunningDisplay(
            statusData.display,
            availableIds,
            statusData.modules,
            next,
          );
        }

        const changed =
          next.mode !== current.mode ||
          next.moduleId !== current.moduleId ||
          next.rotation.moduleIds.join(",") !==
            current.rotation.moduleIds.join(",") ||
          next.rotation.intervalSec !== current.rotation.intervalSec ||
          next.rotation.eventHoldSec !== current.rotation.eventHoldSec ||
          JSON.stringify(next.rotation.moduleSettings) !==
            JSON.stringify(current.rotation.moduleSettings);

        if (changed) {
          saveDisplayPreferences(next);
        }

        return next;
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
      if (prefs.mode === "rotation" && prefs.rotation.moduleIds.length === 0) {
        throw new Error("Mindestens ein Modul für die Rotation auswählen");
      }
      await api.startDisplay(displayBodyFromPrefs(prefs));
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

  async function handleSingleModuleChange(moduleId: string) {
    updatePrefs({ ...prefs, moduleId });

    if (!running || prefs.mode !== "single") {
      return;
    }

    if (moduleId === status?.display.moduleId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.switchDisplayModule(moduleId);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Modulwechsel fehlgeschlagen",
      );
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
  const activeModuleId =
    oledPreview?.activeModuleId ??
    status?.display.rotation?.currentModuleId ??
    status?.display.moduleId ??
    null;

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
          <div className="oled-card-content">
            <div className="oled-preview-slot">
              {oledPreview ? (
                <OledLivePreview preview={oledPreview} />
              ) : (
                <p className="hint">OLED-Vorschau wird geladen…</p>
              )}
            </div>
            <div className="oled-meta-slot">
              {oledPreview ? (
                <OledPreviewMeta
                  preview={oledPreview}
                  activeModuleId={activeModuleId}
                  modules={status?.modules ?? []}
                />
              ) : null}
            </div>
          </div>
        </article>

        <article className="card wide">
          <h2>Steuerung</h2>

          <div className="display-mode-row">
            <span className="display-mode-label">Anzeige-Modus</span>
            <FlipSwitch
              value={prefs.mode}
              options={[
                { value: "single", label: "Einzelmodul" },
                { value: "rotation", label: "Rotation" },
              ]}
              onChange={(mode) => void handleDisplayModeChange(mode)}
              disabled={loading || !connected}
              ariaLabel="Anzeige-Modus"
            />
          </div>

          {prefs.mode === "single" ? (
            <div className="module-row">
              <label htmlFor="module">Anzeige-Modul</label>
              <select
                id="module"
                value={prefs.moduleId}
                onChange={(e) => void handleSingleModuleChange(e.target.value)}
                disabled={loading || !connected}
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
                moduleSettings={prefs.rotation.moduleSettings}
                eventHoldSec={prefs.rotation.eventHoldSec}
                disabled={!connected}
                onChange={(moduleIds) =>
                  void handleRotationModuleIdsChange(moduleIds)
                }
                onModuleSettingsChange={(moduleId, settings) =>
                  void handleModuleSettingsChange(moduleId, settings)
                }
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
                    onBlur={() => void handleRotationTimingBlur()}
                    disabled={loading || !connected}
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
                    onBlur={() => void handleRotationTimingBlur()}
                    disabled={loading || !connected}
                  />
                </label>
              </div>
            </div>
          )}

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
              className="danger"
              onClick={() => void handleFeatureTest()}
              disabled={loading || !running}
              title="Belastet das GameDAC stark — nur für Tests"
            >
              Feature-Test
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
