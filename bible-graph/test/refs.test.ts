import { describe, expect, it } from "vitest";

import { BOOKS } from "../src/graph/books.js";
import { displayRef, normalizeRef, parseWordId, resolveBook } from "../src/graph/refs.js";

describe("books", () => {
  it("has the 66-book canon in order", () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS.filter((b) => b.testament === "NT")).toHaveLength(27);
    expect(BOOKS[0]?.id).toBe("Gen");
    expect(BOOKS[39]?.id).toBe("Mat");
    expect(BOOKS.map((b) => b.ord)).toEqual(BOOKS.map((_, i) => i + 1));
  });

  it("has no alias that maps to two books", () => {
    const seen = new Map<string, string>();
    for (const b of BOOKS) {
      for (const key of [b.id, b.name, ...b.aliases].map((k) => k.toLowerCase().replace(/[\s.]/g, ""))) {
        const prior = seen.get(key);
        expect(prior === undefined || prior === b.id, `${key}: ${prior} vs ${b.id}`).toBe(true);
        seen.set(key, b.id);
      }
    }
  });
});

describe("normalizeRef", () => {
  it.each([
    ["John 21:15", "Jhn.21.15"],
    ["Jn 21.15", "Jhn.21.15"],
    ["Jhn.21.15", "Jhn.21.15"],
    ["1 Cor 13:4", "1Co.13.4"],
    ["1cor 13:4", "1Co.13.4"],
    ["psalm 23:1", "Psa.23.1"],
    ["Song of Songs 2:4", "Sng.2.4"],
    ["Ezek. 37:1", "Ezk.37.1"],
    ["  Genesis 1:1 ", "Gen.1.1"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeRef(input)).toBe(expected);
  });

  it.each(["", "Hezekiah 1:1", "John 0:1", "John 21", "Tobit 1:1"])("rejects %j", (input) => {
    expect(normalizeRef(input)).toBeNull();
  });

  it("resolves book names", () => {
    expect(resolveBook("Revelation")).toBe("Rev");
    expect(resolveBook("Phm")).toBe("Phm");
    expect(resolveBook("Phil")).toBe("Php");
  });

  it("formats for display", () => {
    expect(displayRef({ book: "1Co", chapter: 13, verse: 4 })).toBe("1 Corinthians 13:4");
  });
});

describe("parseWordId (TAGNT/TAHOT first column)", () => {
  it("parses a TAGNT word ID", () => {
    expect(parseWordId("Mat.1.1#01=NKO")).toEqual({
      ref: { book: "Mat", chapter: 1, verse: 1, word: 1 },
      verseId: "Mat.1.1",
      id: "Mat.1.1#01",
      altRef: null,
      textType: "NKO",
    });
  });

  it("keeps bracketed variant type codes", () => {
    expect(parseWordId("Mat.1.6#14=N(k)O")?.textType).toBe("N(k)O");
  });

  it("captures alternate versification", () => {
    const parsed = parseWordId("Mal.4.1(3.19)#02=L");
    expect(parsed?.verseId).toBe("Mal.4.1");
    expect(parsed?.altRef).toBe("Mal.3.19");
  });

  it("rejects header and interlinear rows", () => {
    expect(parseWordId("Word & Type")).toBeNull();
    expect(parseWordId("# Mat.1.1")).toBeNull();
  });
});
