# AGENTS.md — Bible Graph

Read `SPEC.md` (what to build) and `PLAN.md` (what's next) before starting work.
Update the PLAN checkboxes as phases progress.

## Commands

```bash
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run fetch:data  # download STEPBible files into data/raw/ (Phase 1)
npm run build:db    # build data/bible-graph.sqlite (Phase 1)
```

Run `npm run typecheck && npm test` before every commit.

## Conventions

- TypeScript, ESM (`"type": "module"`), `NodeNext` resolution. Local imports use `.js` suffixes.
- Import order: node built-ins, third-party, `import type`, then local modules.
- Pure functions in `src/graph/` (no I/O beyond the DB handle passed in); I/O lives in `src/ingest/`, `src/mcp/`, `src/server/`.
- Node IDs follow SPEC §4 exactly. They are a public contract (agent citations, URLs).
- Tests live in `test/`; small sample rows go in `test/fixtures/`. Never commit full STEPBible files.

## Data rules (license)

- STEPBible data is CC BY 4.0. Keep the attribution from SPEC §3 in README, app footer, and About page.
- Do not commit or re-host raw data files (`data/raw/` is gitignored).
- Record any transformation of the source data in `DATA_CHANGES.md`.

## Agent behavior rules (product)

- The in-app agent cites node IDs (`[[G0026]]`, `[[Jhn.21.15]]`) that came from tool results this turn.
- Report what the data shows; label interpretation as interpretation; take no doctrinal sides.

## Hackathon boundary

Everything in this folder was created during the AI for Church build window (from Nov 4, 2026).
The parent repo's Obsidian plugin is earlier work and is not part of this submission.
