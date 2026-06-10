import { useState, type DragEvent } from "react";
import type { ModuleInfo } from "../api";
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
  disabled?: boolean;
  onChange: (moduleIds: string[]) => void;
}

export function RotationModuleList({
  modules,
  selectedIds,
  disabled = false,
  onChange,
}: RotationModuleListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

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
    onChange(moveItem(selectedIds, from, to));
  }

  function addModule(moduleId: string) {
    onChange([...selectedIds, moduleId]);
  }

  function removeModule(moduleId: string) {
    onChange(selectedIds.filter((id) => id !== moduleId));
  }

  function handleDragStart(index: number) {
    if (disabled) return;
    setDragIndex(index);
    setDropIndex(index);
  }

  function handleDragOver(index: number, event: DragEvent) {
    if (disabled || dragIndex === null) return;
    event.preventDefault();
    setDropIndex(index);
  }

  function handleDrop(index: number) {
    if (disabled || dragIndex === null) return;
    reorder(dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="rotation-module-list">
      <p className="rotation-list-hint">
        Reihenfolge per Ziehen ändern — oben zuerst in der Rotation.
      </p>

      {selectedModules.length > 0 ? (
        <ol className="rotation-queue">
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
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleDragOver(index, event)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              <span className="rotation-drag-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="rotation-queue-position">{index + 1}</span>
              <div className="rotation-queue-text">
                <span className="rotation-queue-name">{module.name}</span>
                {module.description ? (
                  <span className="rotation-queue-desc">{module.description}</span>
                ) : null}
              </div>
              <button
                type="button"
                className="rotation-remove-btn"
                onClick={() => removeModule(module.id)}
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
    </div>
  );
}
