/**
 * OLED-Font (6×8) nur druckbare ASCII — Umlaute → ae/oe/ue, Rest entfernen.
 * Original-Strings in API/Web bleiben unverändert; nur Bitmap-Rendering nutzt das.
 */
const UMLAUT_REPLACEMENTS: ReadonlyArray<[string, string]> = [
  ["ä", "ae"],
  ["ö", "oe"],
  ["ü", "ue"],
  ["Ä", "Ae"],
  ["Ö", "Oe"],
  ["Ü", "Ue"],
  ["ß", "ss"],
];

export function sanitizeOledText(text: string): string {
  let result = text;
  for (const [from, to] of UMLAUT_REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result.replace(/[^\x20-\x7E]/g, "");
}
