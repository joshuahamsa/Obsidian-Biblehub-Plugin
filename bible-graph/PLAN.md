# Bible Graph — Build Plan

Deadline: **Nov 27, 2026 23:59 ET**. Internal target: **submit by Nov 25**.
Agent builds; Josh reviews, decides, and records the demo.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Spec & scaffold (Nov 4)
- [x] Confirm data sources, licenses, file formats
- [x] SPEC.md, PLAN.md, AGENTS.md
- [x] TypeScript + Vitest skeleton, ref normalizer with tests
- [ ] Josh: review SPEC §4 (graph model) and §6 (agent contract)

## Phase 1 — Ingest (target Nov 8)
- [ ] `scripts/fetch-data.ts`: download STEPBible files to `data/raw/`, record commit SHA in `meta`
- [ ] Book seed table (66 books, corpus groupings)
- [ ] TAGNT parser → occurrences (+ default-text flag)
- [ ] TAHOT parser → occurrences (+ affixes, Qere/Ketiv)
- [ ] TBESG/TBESH parsers → lemmas + `greek_of`, `part_of`, `lexicon_ref` edges
- [ ] Grammar code tables (TEGMC/TEHMC)
- [ ] Verse English reconstruction
- [ ] `npm run build:db` → `data/bible-graph.sqlite`
- [ ] Count tests pass; `DATA_CHANGES.md` written
- [ ] Josh: spot-check 5 words you know well

## Phase 2 — Query layer + MCP (target Nov 12)
- [ ] `src/graph/*` functions from SPEC §5, with fixture-DB tests
- [ ] MCP server (stdio) exposing the same tools
- [ ] CLI for debugging
- [ ] Spike: `lxx_for` matching quality
- [ ] Josh: install MCP in Claude Desktop, try the §2 questions
- **Fallback checkpoint:** if behind schedule, this is a submittable entry.

## Phase 3 — Web app (target Nov 19)
- [ ] Fastify API: `/api/chat` (SSE), `/api/node/:id`, `/api/verse/:ref`
- [ ] Agent loop with citation check
- [ ] React UI: chat, graph canvas, node drawer, interlinear view
- [ ] Rate limit + token budget
- [ ] Josh: UX pass, list changes

## Phase 4 — Eval, polish, deploy (target Nov 23)
- [ ] Eval set (~20 Qs) + `npm run eval` report
- [ ] Fix top failures; tune prompt
- [ ] Deploy hosted demo; About/attribution page
- [ ] Move to standalone repo

## Phase 5 — Submit (Nov 24–25)
- [ ] Demo script (≤5 min): problem → live question → graph path → citation check → MCP in Claude
- [ ] Josh: record video, write description (call out the Obsidian plugin as earlier, unjudged inspiration)
- [ ] Submit
