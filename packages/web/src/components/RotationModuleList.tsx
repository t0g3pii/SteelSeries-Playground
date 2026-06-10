import { useState, type DragEvent } from "react";
import type { ModuleInfo } from "../api";
import { ModuleSettingsDialog } from "./ModuleSettingsDialog";
import "./RotationModuleList.css";

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

interface RotationModuleListProps {
  modules: ModuleInfo[];
  selectedIds: string[];
  moduleSettings: Record<string, Record<string, boolean>>;
  eventHoldSec: number;
  disabled?: boolean;
  onChange: (moduleIds: string[]) => void;
  onModuleSettingsChange: (
    moduleId: string,
    settings: Record<string, boolean>,
  ) => void;
}

export function RotationModuleList({
  modules,
  selectedIds,
  moduleSettings,
  eventHoldSec,
  disabled = false,
  onChange,
  onModuleSettingsChange,
}: RotationModuleListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [settingsModuleId, setSettingsModuleId] = useState<string | null>(null);

  const rotatable = modules.filter(
    (module) => module.supportsRotation !== false,
  );

  const selectedModules = selectedIds
    .map((id) => rotatable.find((module) => module.id === id))
    .filter((module): module is ModuleInfo => module !== undefined);

  const availableModules = rotatable.filter(
    (module) => !selectedIds.includes(module.id),
  );

  function reorder(from: number, to: number) {
    const next = moveItem(selectedIds, from, to);
    if (next.join(",") === selectedIds.join(",")) {
      return;
    }
    onChange(next);
  }

  function addModule(moduleId: string) {
    onChange([...selectedIds, moduleId]);
  }

  function removeModule(moduleId: string) {
    onChange(selectedIds.filter((id) => id !== moduleId));
  }

  function handleDragStart(index: number, event: DragEvent) {
    if (disabled) return;
    // Ohne setData funktionieren wiederholte Drags in Firefox/Chrome oft nur einmal.
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.dropEffect = "move";
    setDragIndex(index);
    setDropIndex(index);
  }

  function handleDragOver(index: number, event: DragEvent) {
    if (disabled || dragIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function handleDrop(index: number, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || dragIndex === null) return;
    reorder(dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleListDragOver(event: DragEvent) {
    if (disabled || dragIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  const settingsModule = settingsModuleId
    ? selectedModules.find((module) => module.id === settingsModuleId)
    : null;

  const hasActiveSettings = (module: ModuleInfo): boolean =>
    (module.rotationSettings ?? []).some(
      (def) => moduleSettings[module.id]?.[def.id],
    );

  return (
    <div className="rotation-module-list">
      <p className="rotation-list-hint">
        Reihenfolge per Ziehen ändern — oben zuerst in der Rotation.
      </p>

      {selectedModules.length > 0 ? (
        <ol
          className="rotation-queue"
          onDragOver={handleListDragOver}
        >
          {selectedModules.map((module, index) => (
            <li
              key={module.id}
              className={[
                "rotation-queue-item",
                dragIndex === index ? "dragging" : "",
                dropIndex === index && dragIndex !== null && dragIndex !== index
                  ? "drop-target"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={!disabled}
              onDragStart={(event) => handleDragStart(index, event)}
              onDragOver={(event) => handleDragOver(index, event)}
              onDrop={(event) => handleDrop(index, event)}
              onDragEnd={handleDragEnd}
            >
              <span className="rotation-drag-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="rotation-queue-position">{index + 1}</span>
              <div className="rotation-queue-text">
                <span className="rotation-queue-name">
                  {module.name}
                  {hasActiveSettings(module) ? (
                    <span className="rotation-settings-badge" title="Events aktiv">
                      ⚡
                    </span>
                  ) : null}
                </span>
                {module.description ? (
                  <span className="rotation-queue-desc">{module.description}</span>
                ) : null}
              </div>
              {(module.rotationSettings?.length ?? 0) > 0 ? (
                <button
                  type="button"
                  className="rotation-settings-btn"
                  onClick={() => setSettingsModuleId(module.id)}
                  onDragStart={(event) => event.preventDefault()}
                  disabled={disabled}
                  aria-label={`${module.name} Einstellungen`}
                  title="Einstellungen"
                >
                  ⚙
                </button>
              ) : null}
              <button
                type="button"
                className="rotation-remove-btn"
                onClick={() => removeModule(module.id)}
                onDragStart={(event) => event.preventDefault()}
                disabled={disabled || selectedModules.length <= 1}
                aria-label={`${module.name} aus Rotation entfernen`}
              >
                Entfernen
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hint rotation-empty">Noch keine Module in der Rotation.</p>
      )}

      {availableModules.length > 0 ? (
        <div className="rotation-available">
          <span className="rotation-available-label">Hinzufügen</span>
          <div className="rotation-available-actions">
            {availableModules.map((module) => (
              <button
                key={module.id}
                type="button"
                className="rotation-add-btn"
                onClick={() => addModule(module.id)}
                disabled={disabled}
              >
                + {module.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {settingsModule ? (
        <ModuleSettingsDialog
          module={settingsModule}
          settings={moduleSettings[settingsModule.id] ?? {}}
          eventHoldSec={eventHoldSec}
          onClose={() => setSettingsModuleId(null)}
          onSave={(settings) => onModuleSettingsChange(settingsModule.id, settings)}
        />
      ) : null}
    </div>
  );
}
