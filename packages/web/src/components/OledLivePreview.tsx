import { useEffect, useRef } from "react";
import type { OledPreviewResponse } from "../api";
import { componentTestLabel } from "../component-tests";
import { applyDeviceViewMask } from "../oled/applyDeviceView";
import { decodeBitmapToImageData, OLED_OFF } from "../oled/decodeBitmap";
import "./OledLivePreview.css";

/** Internes 2×-Rendering; Anzeigegröße steuert CSS (pixelgenau). */
const RENDER_SCALE = 2;

function frameKindLabel(preview: OledPreviewResponse): string {
  if (preview.frameKind === "feature-test") return "Feature-Test";
  if (preview.frameKind === "progress-bar-test") return "Progressbar-Test";
  if (preview.frameKind === "gauge-test") return "Gauge-Test";
  if (preview.frameKind === "component-test") {
    return componentTestLabel(preview.componentTestId) ?? "Komponenten-Test";
  }
  if (preview.activeDisplayMode === "text" && preview.running) {
    return "Text auf GameDAC";
  }
  if (preview.frameKind === "media") return "Now Playing";
  if (preview.frameKind === "ip") return "IP-Anzeige";
  if (!preview.running) return "Offline";
  return "Vorschau";
}

export function OledLivePreview({ preview }: { preview: OledPreviewResponse }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayHeight = preview.displayHeight ?? preview.deviceView.maskBelowY;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, bitmap, deviceView } = preview;
    canvas.width = width * RENDER_SCALE;
    canvas.height = displayHeight * RENDER_SCALE;

    ctx.fillStyle = OLED_OFF;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imageData = decodeBitmapToImageData(bitmap, width, height);
    applyDeviceViewMask(
      imageData.data,
      width,
      height,
      deviceView.maskBelowY,
    );

    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = displayHeight;
    offscreen
      .getContext("2d")!
      .putImageData(imageData, 0, 0, 0, 0, width, displayHeight);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }, [preview, displayHeight]);

  const notBitmapOnDevice =
    preview.running && preview.activeDisplayMode === "text";

  return (
    <div className="oled-live">
      <div className="oled-bezel">
        <canvas
          ref={canvasRef}
          className="oled-canvas"
          style={{ aspectRatio: `${preview.width} / ${displayHeight}` }}
          aria-label="OLED Live-Ansicht"
        />
        <div className="oled-brand">steelseries</div>
      </div>
      <div className="oled-meta">
        <span className="oled-meta-tag">{frameKindLabel(preview)}</span>
        <span className="oled-meta-dim">
          {preview.width}×{displayHeight}
        </span>
        {!preview.running && (
          <span className="oled-meta-idle">Display aus</span>
        )}
        {preview.running && (
          <span className="oled-meta-live">Geräteansicht</span>
        )}
      </div>
      {notBitmapOnDevice && (
        <p className="hint oled-warn">
          GameDAC nutzt Text-Modus — diese Vorschau zeigt den zuletzt gesendeten
          Bitmap-Frame (falls vorhanden), nicht die GG-Textdarstellung.
        </p>
      )}
    </div>
  );
}
