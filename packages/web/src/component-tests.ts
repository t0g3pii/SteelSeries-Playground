export type ComponentTestId =
  | "volume-bars"
  | "sparkline"
  | "clock"
  | "status-tile"
  | "equalizer"
  | "spinner"
  | "marquee"
  | "seven-segment";

export interface ComponentTestMeta {
  id: ComponentTestId;
  label: string;
  totalMs: number;
}

export const COMPONENT_TESTS: ComponentTestMeta[] = [
  { id: "volume-bars", label: "Volume-Balken", totalMs: 12_000 },
  { id: "sparkline", label: "Sparkline", totalMs: 15_000 },
  { id: "clock", label: "Uhr", totalMs: 10_000 },
  { id: "status-tile", label: "Status-Kachel", totalMs: 12_000 },
  { id: "equalizer", label: "Equalizer", totalMs: 10_000 },
  { id: "spinner", label: "Spinner", totalMs: 8_000 },
  { id: "marquee", label: "Marquee", totalMs: 15_000 },
  { id: "seven-segment", label: "7-Segment", totalMs: 11_000 },
];

const COMPONENT_TEST_LABELS: Record<ComponentTestId, string> = {
  "volume-bars": "Volume-Balken",
  sparkline: "Sparkline",
  clock: "Uhr",
  "status-tile": "Status-Kachel",
  equalizer: "Equalizer",
  spinner: "Spinner",
  marquee: "Marquee",
  "seven-segment": "7-Segment",
};

export function componentTestLabel(id: ComponentTestId | null): string | null {
  if (!id) return null;
  return COMPONENT_TEST_LABELS[id];
}
