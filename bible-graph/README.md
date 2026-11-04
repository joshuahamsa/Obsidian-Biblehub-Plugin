# Bible Graph

A concordance in the form of a knowledge graph, built for AI-assisted Bible study.

Ask a question about a Greek or Hebrew word and an AI agent walks the graph (words → verses →
lexicon entries → related words) and answers with citations you can click and verify.

**Status:** Phase 0, spec and scaffold. See [SPEC.md](SPEC.md) and [PLAN.md](PLAN.md).

## Development

```bash
npm install
npm test
```

## Data & attribution

Original-language text, glosses, grammar, and lexicons:

> Data created by [STEPBible.org](https://www.STEPBible.org) based on work at Tyndale House Cambridge,
> licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> Source: https://STEPBible.github.io/STEPBible-Data

The raw data files are not redistributed here. `npm run fetch:data` downloads them from the source.

## Provenance

Built for the AI for Church Hackathon (Oct 30 – Nov 27, 2026). Inspired by an earlier Obsidian
plugin that imported BibleHub lexicon entries as linked notes. No code or data from that plugin is used.
