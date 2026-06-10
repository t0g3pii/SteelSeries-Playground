import { useEffect, useState } from "react";
import type { ModuleInfo } from "../api";
import "./ModuleSettingsDialog.css";

interface ModuleSettingsDialogProps {
  module: ModuleInfo;
  settings: Record<string, boolean>;
  eventHoldSec: number;
  onClose: () => void;
  onSave: (settings: Record<string, boolean>) => void;
}

export function ModuleSettingsDialog({
  module,
  settings,
  eventHoldSec,
  onClose,
  onSave,
}: ModuleSettingsDialogProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings, module.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const defs = module.rotationSettings ?? [];

  function toggleSetting(id: string, enabled: boolean) {
    setDraft((current) => ({ ...current, [id]: enabled }));
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <div
      className="module-settings-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="module-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="module-settings-header">
          <div>
            <p className="module-settings-eyebrow">Modul-Einstellungen</p>
            <h3 id="module-settings-title">{module.name}</h3>
          </div>
          <button
            type="button"
            className="module-settings-close"
            onClick={onClose}
            aria-label="Schließen"
          >
            ×
          </button>
        </header>

        {defs.length > 0 ? (
          <div className="module-settings-list">
            {defs.map((def) => (
              <label key={def.id} className="module-settings-option">
                <input
                  type="checkbox"
                  checked={draft[def.id] ?? false}
                  onChange={(event) =>
                    toggleSetting(def.id, event.target.checked)
                  }
                />
                <span className="module-settings-option-text">
                  <span className="module-settings-option-label">
                    {def.label}
                  </span>
                  {def.description ? (
                    <span className="module-settings-option-desc">
                      {def.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="hint module-settings-empty">
            Für dieses Modul gibt es keine Einstellungen.
          </p>
        )}

        <p className="hint module-settings-hint">
          Event-Anzeige dauert aktuell {eventHoldSec} Sekunden (global unter
          „Event-Anzeige“).
        </p>

        <footer className="module-settings-footer">
          <button type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="primary" onClick={handleSave}>
            Übernehmen
          </button>
        </footer>
      </div>
    </div>
  );
}
