import type { Lang } from "./types";

export function normalizeStrongId(raw: string, langHint?: Lang): string | null {
  const s = raw.trim();

  // Already like G2198 / H1623
  const m1 = s.match(/\b([GH])\s*0*([0-9]{1,5})\b/i);
  if (m1) return m1[1].toUpperCase() + String(parseInt(m1[2], 10));

  // Bare number: use hint
  const m2 = s.match(/\b0*([0-9]{1,5})\b/);
  if (m2 && langHint) {
    const prefix = langHint === "greek" ? "G" : "H";
    return prefix + String(parseInt(m2[1], 10));
  }

  return null;
}

export function langFromStrong(strong: string): Lang {
  return strong.toUpperCase().startsWith("G") ? "greek" : "hebrew";
}

export function strongsUrl(strong: string): string {
  const lang = langFromStrong(strong);
  const n = strong.slice(1);
  return `https://biblehub.com/strongs/${lang}/${n}.htm`;
}

export function langPageUrl(strong: string): string {
  const lang = langFromStrong(strong);
  const n = strong.slice(1);
  return `https://biblehub.com/${lang}/${n}.htm`;
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "—").replace(/\s+/g, " ").trim();
}
