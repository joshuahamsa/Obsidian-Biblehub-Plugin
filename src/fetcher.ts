import { requestUrl } from "obsidian";

export class Fetcher {
  private lastFetchAt = 0;
  private cache = new Map<string, { at: number; text: string }>();

  constructor(private rateLimitMs: number) {}

  setRateLimit(ms: number) {
    this.rateLimitMs = ms;
  }

  async get(url: string, useCache = true): Promise<string> {
    if (useCache) {
      const hit = this.cache.get(url);
      if (hit) return hit.text;
    }

    await this.rateLimit();
    const res = await requestUrl({ url });
    const text = res.text;
    this.cache.set(url, { at: Date.now(), text });
    return text;
  }

  private async rateLimit() {
    const now = Date.now();
    const delta = now - this.lastFetchAt;
    if (delta < this.rateLimitMs) {
      await new Promise((r) => setTimeout(r, this.rateLimitMs - delta));
    }
    this.lastFetchAt = Date.now();
  }
}