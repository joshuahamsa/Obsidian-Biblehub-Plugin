export interface InterlinearWord {
  strong: string;
  transliteration?: string;
  original?: string;
  gloss?: string;
  morphology?: string;
  morphologyDetail?: string;
}

export function parseInterlinearWords(html: string): InterlinearWord[] {
  const tables =
    html.match(/<table class="tablefloat(?:heb)?">[\s\S]*?<\/table>/gi) ?? [];
  const out: InterlinearWord[] = [];

  for (const table of tables) {
    const strongMatch = table.match(/href="\/(greek|hebrew)\/(\d+)\.htm"/i);
    if (!strongMatch) continue;

    const prefix = strongMatch[1].toLowerCase() === "greek" ? "G" : "H";
    const strong = `${prefix}${parseInt(strongMatch[2], 10)}`;

    const transliteration = extractSpanText(table, "translit");
    const original =
      extractSpanText(table, "greek") ?? extractSpanText(table, "hebrew");
    const gloss = normalizeGloss(extractSpanText(table, "eng"));
    const { code: morphology, detail: morphologyDetail } =
      extractMorphCode(table);

    out.push({
      strong,
      transliteration,
      original,
      gloss,
      morphology,
      morphologyDetail,
    });
  }

  return out;
}

function extractSpanText(html: string, className: string): string | undefined {
  const re = new RegExp(
    `<span class="${className}">([\\s\\S]*?)<\\/span>`,
    "i"
  );
  const m = html.match(re);
  if (!m) return undefined;
  const text = stripHtml(m[1]);
  return text || undefined;
}

function extractMorphCode(html: string): { code?: string; detail?: string } {
  const all = Array.from(
    html.matchAll(/<span class="(?:strongsnt2|strongsnt)">([\s\S]*?)<\/span>/gi)
  );
  if (!all.length) return {};

  const last = all[all.length - 1][1];
  const text = stripHtml(last) || undefined;
  const titleMatch = last.match(/title="([^"]+)"/i);
  const detail = titleMatch
    ? decodeHtmlEntities(titleMatch[1]).trim()
    : undefined;

  return {
    code: text,
    detail: detail || undefined,
  };
}

function normalizeGloss(gloss?: string): string | undefined {
  if (!gloss) return undefined;
  const clean = gloss.replace(/\s+/g, " ").trim();
  if (!clean || clean === "-") return undefined;
  return clean;
}

function stripHtml(s: string): string {
  return decodeHtmlEntities(
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = parseInt(n, 10);
      if (Number.isNaN(code)) return "";
      return String.fromCharCode(code);
    });
}
