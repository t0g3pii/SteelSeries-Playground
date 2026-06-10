import { useEffect, useState } from "react";
import { api, type ModuleInfo, type OledPreviewResponse } from "../api";
import "./OledPreviewMeta.css";

interface MetaField {
  label: string;
  value: string;
}

interface OledPreviewMetaProps {
  preview: OledPreviewResponse;
  activeModuleId: string | null;
  modules: ModuleInfo[];
}

function moduleName(modules: ModuleInfo[], id: string | null): string {
  if (!id) return "—";
  return modules.find((module) => module.id === id)?.name ?? id;
}

export function OledPreviewMeta({
  preview,
  activeModuleId,
  modules,
}: OledPreviewMetaProps) {
  const [extraFields, setExtraFields] = useState<MetaField[]>([]);

  useEffect(() => {
    if (!preview.running || !activeModuleId) {
      setExtraFields([]);
      return;
    }

    if (activeModuleId === "media" && preview.media) {
      setExtraFields([]);
      return;
    }

    if (activeModuleId === "ip") {
      setExtraFields([]);
      return;
    }

    let cancelled = false;

    const load = () => {
      void api
        .getModule(activeModuleId)
        .then((response) => {
          if (cancelled) return;

          const data = response.data;
          if (data && typeof data === "object") {
            const record = data as Record<string, unknown>;
            const fields: MetaField[] = [];

            if (typeof record.time === "string") {
              fields.push({ label: "Uhrzeit", value: record.time });
            }
            if (typeof record.label === "string") {
              fields.push({ label: "Modul", value: record.label });
            }

            setExtraFields(
              fields.length > 0
                ? fields
                : [{ label: "Modul", value: response.name }],
            );
            return;
          }

          setExtraFields([{ label: "Modul", value: response.name }]);
        })
        .catch(() => {
          if (!cancelled) {
            setExtraFields([
              { label: "Modul", value: moduleName(modules, activeModuleId) },
            ]);
          }
        });
    };

    load();
    const timer = setInterval(load, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeModuleId, preview.running, preview.media, modules]);

  if (!preview.running) {
    return (
      <dl className="oled-preview-meta oled-preview-meta--idle">
        <div>
          <dt>Status</dt>
          <dd>Display aus</dd>
        </div>
      </dl>
    );
  }

  if (activeModuleId === "media" && preview.media) {
    return (
      <dl className="oled-preview-meta">
        <div>
          <dt>Titel</dt>
          <dd>{preview.media.title || "—"}</dd>
        </div>
        <div>
          <dt>Interpret</dt>
          <dd>{preview.media.artist || "—"}</dd>
        </div>
        {preview.media.timeline ? (
          <div>
            <dt>Zeit</dt>
            <dd>{preview.media.timeline}</dd>
          </div>
        ) : (
          <div className="oled-preview-meta-placeholder" aria-hidden="true" />
        )}
        <div>
          <dt>App</dt>
          <dd>{preview.media.appLabel || "—"}</dd>
        </div>
      </dl>
    );
  }

  if (activeModuleId === "ip") {
    return (
      <dl className="oled-preview-meta">
        <div>
          <dt>LAN</dt>
          <dd>{preview.lan}</dd>
        </div>
        <div>
          <dt>WAN</dt>
          <dd>{preview.wan}</dd>
        </div>
        <div className="oled-preview-meta-placeholder" aria-hidden="true" />
        <div className="oled-preview-meta-placeholder" aria-hidden="true" />
      </dl>
    );
  }

  const fields =
    extraFields.length > 0
      ? extraFields
      : [{ label: "Modul", value: moduleName(modules, activeModuleId) }];

  return (
    <dl className="oled-preview-meta">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
      {Array.from({ length: Math.max(0, 4 - fields.length) }).map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className="oled-preview-meta-placeholder"
          aria-hidden="true"
        />
      ))}
    </dl>
  );
}
