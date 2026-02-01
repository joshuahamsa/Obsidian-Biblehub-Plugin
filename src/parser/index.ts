import type { LexiconEntry } from "../types";
import { parseStrongsPage } from "./strongs";

export function parseEntryFromStrongsPage(strong: string, url: string, html: string): LexiconEntry {
  return parseStrongsPage(strong, url, html);
}