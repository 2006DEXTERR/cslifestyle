# Phase 7 — AI Center Blueprint Compliance Report (pre-implementation)

**Date:** 2026-06-15 · **Phase:** 7 — AI Content Engine & AI Center · **Status:** Audit (no code written yet)

Produced **before** any Phase 7 code, per instruction. Determines the exact AI-Center structure the
blueprint requires, identifies every required AI feature, and states for each whether it requires a
**new UI surface** or integrates into / wires up the existing design.

**Precedence rule applied:** the blueprint takes precedence over UI preservation. Where the blueprint
prescribes a UI structure, it is implemented as specified; where it prescribes only *functionality*,
the existing AI-Center layout is preserved and the functionality is integrated into it.

**Authoritative source:** the original 83-page blueprint is not in the repo; the distilled,
section-referenced spec is [02-specification-breakdown.md](../02-specification-breakdown.md), with
supporting design in 05/06/07/08 and sequencing in [09-feature-roadmap.md](../09-feature-roadmap.md).
All citations below are file + line.

---

## 1. Does the blueprint require a Prompts tab / page / section? — **No.**

Every AI-Center reference specifies **functionality**, never a UI structure:

| Source | Verbatim | Prescribes UI structure? |
| ------ | -------- | ------------------------ |
| `02` §3.8 FR-060 (L114) | "AI Centre: queue monitor, retry failed, **edit prompts**, cost logs." | No — names 4 functions |
| `02` §3.7 FR-054 (L106) | "Prompt templates admin-editable (stored in settings)." | No — capability + storage |
| `09` Phase 5 (L83) | "wire AI Center (incl. **new prompt editor**)." | No — requires a prompt-editor surface exists; tab/page/section unspecified |
| `07` §2.6 (L65) | `GET /admin/ai/prompts` · `PUT /admin/ai/prompts/{type}` | No — backing API only |

A repo-wide search for `§14`, "Prompts tab", "Prompts page", "Prompts section", or any AI-Center
layout/tab spec returns **nothing**. The blueprint therefore mandates **prompt-management
functionality**, not a specific structure.

**Determination (per the decision rule):** preserve the existing AI-Center layout and **integrate
prompt management into it**. A prompt-editor surface *must be added* (FR-054/FR-060 "edit prompts" +
roadmap "new prompt editor" — the capability has zero current UI), but it is integrated in the
existing card/tab visual language rather than driving a redesign. This is the **only** required new UI
surface; everything else wires existing surfaces to real data.

---

## 2. Required AI-Center structure (derived from FR-060 + §10)

FR-060 enumerates the AI Centre's required functions. Mapping them to the current four tabs in
[app/admin/ai/page.tsx](../../../app/admin/ai/page.tsx):

| FR-060 function | Current AI-Center surface | State |
| --------------- | ------------------------- | ----- |
| **queue monitor** | "AI Queue" tab | exists, mock — **wire** |
| **retry failed** | (no control in Queue tab) | **add controls** into existing Queue tab (no new surface) |
| **edit prompts** | — none — | **new surface** (integrated, design-consistent) |
| **cost logs** | "AI Logs" tab (renders nothing) + "Usage & Costs" tab | tab exists but empty — **fill**, no new surface |

Plus the current "AI Providers" tab backs FR-053 (provider configurable). No blueprint conflict with
the existing tab set — the structure is compatible; it is unwired, missing retry controls, has an
empty Logs panel, and lacks prompt editing.

---

## 3. Feature-by-feature compliance matrix

Legend — **New UI surface?**: 🆕 new surface required · 🔁 wire existing surface to real data ·
➕ add control into an existing surface · ⚙️ backend-only (no UI).

| # | Required AI feature | Blueprint cite | Prescribes UI structure? | New UI surface? | Current state | Phase 7 (missing only) |
| - | ------------------- | -------------- | ------------------------ | --------------- | ------------- | ---------------------- |
| 1 | AI jobs auto-dispatched on import (title/meta/desc/pros/cons/5 FAQs) | FR-006, FR-050 (`02` L45,102) | No | ⚙️ | ❌ none | Enqueue AI jobs from ImportService; per-entity job dispatcher |
| 2 | Queue workers, configurable concurrency (default 4), ≥1000 jobs/hr | FR-051 (`02` L103), §4.2 (L136) | No | ⚙️ | ❌ none | BullMQ `ai-*` queues + workers (reuse ADR-023 inline/bullmq driver) |
| 3 | AI content stored; view/edit/approve/regenerate per field | FR-052 (`02` L104) | No (field editors already exist) | 🔁 + ➕ | 🟡 field editors exist; no store/approve | AI result store; approve gate; `POST /admin/products/{id}/regenerate-ai` |
| 4 | Provider abstraction: Claude primary / OpenAI fallback / Gemini | FR-053 (`02` L105), §10 (L171), `05` §8 | No | 🔁 | 🟡 Providers tab (mock) | Provider abstraction layer; encrypted keys (`Setting` group `ai_provider`, reuse `lib/crypto`) |
| 5 | **Prompt templates admin-editable** (9 types), stored in settings | FR-054 (`02` L106), §10 (L172) | **No** (functionality only) | **🆕** | ❌ no editor anywhere | Prompt store (`Setting` group `ai_prompts`); `GET/PUT /admin/ai/prompts`; **prompt-editor UI integrated into AI Center** |
| 6 | AI logs: model, prompt, response, tokens, cost, status; 30-day retention | FR-055 (`02` L107) | No | 🔁 (fill empty Logs tab) | 🟡 charts mock; Logs tab blank | `AiLog` model + prune job; `GET /admin/ai/logs`; render the existing AI Logs tab |
| 7 | Queue monitor + **retry failed** + retry-all-failed | FR-060 (`02` L114) | No | 🔁 + ➕ | 🟡 Queue tab mock, no retry | Wire Queue tab; add retry / retry-all-failed buttons |
| 8 | Cost logs / usage + stats (tokens, cost, active jobs, providers) | FR-060, FR-057 (`02` L111,114) | No | 🔁 | 🟡 stat cards + charts mock | `GET /admin/ai/stats`; wire stat cards + Usage charts |
| 9 | Bulk generate | `07` §2.6 (L64) `POST /admin/ai/bulk-generate` | No | ➕ | ❌ "New AI Job" button inert | Wire "New AI Job" → bulk-generate |
| 10 | Guide/comparison/category AI generation (generate → edit → publish; AI verdict) | FR-038, FR-041, `07` (L37,43,49) | No | ➕ | ❌/🟡 | `generate-ai` endpoints + buttons on existing content admin editors |
| 11 | Quality validation; **review-before-index gate** | §10.5, §4.6 (`02` L162), `08` L84 | No | ⚙️ | ❌ | `aiStatus` review flag blocks publish/indexing; sanitize AI output as untrusted (NFR-SEC-004) |
| 12 | DB: `AiQueue`, `AiLog` (+ `Product.aiStatus`/`aiGeneratedAt`) | `06` §7.9 (L73-80), L53 | n/a | ⚙️ | ❌ none | New migration |
| 13 | 8 AI endpoints (queue, retry, retry-all-failed, bulk-generate, logs, prompts GET+PUT, stats) | `07` §2.6 (L63-66) | n/a | ⚙️ | ❌ none | New `routes/ai.ts` + Swagger |
| 14 | Provider/prompt secrets encrypted at rest | `06` L88, `08` L66,84 | n/a | ⚙️ | ✅ `lib/crypto` AES-256-GCM exists | Store provider keys via encrypted `Setting` rows |

---

## 4. New-UI-surface summary

- **🆕 New surface (1):** **prompt editor** — required by FR-054/FR-060 + roadmap "new prompt editor",
  with zero current UI. Blueprint does **not** prescribe its structure, so it is integrated into the
  existing AI-Center design (same `rounded-xl` cards + brand-pink tab idiom). Recommended placement: a
  fifth tab consistent with the existing tab bar (lowest-friction integration of the existing pattern),
  listing the 9 template types with a textarea editor + Save → `PUT /admin/ai/prompts/{type}`.
- **🔁 Wire existing surfaces (no structural change):** Queue tab, Providers tab, Usage & Costs charts,
  stat cards, and the currently-empty **AI Logs** tab (fill it — the tab already exists).
- **➕ Add controls into existing surfaces:** retry / retry-all-failed (Queue tab), "New AI Job" →
  bulk-generate, `generate-ai`/`regenerate-ai` buttons on existing product/guide/comparison editors.
- **⚙️ Backend-only (no UI):** models, queues/workers, provider abstraction, prompt/secret storage,
  endpoints, validation + review gate, retention prune.

**Net:** exactly **one** new UI surface (prompt editor, design-integrated). All other AI-Center work
is wiring existing surfaces or adding controls within them — no redesign, no color/route/component
changes.

---

## 5. Pre-existing UI defects to fix while wiring (not redesigns)

1. **AI Logs tab renders nothing** — `AnimatePresence` in `page.tsx` has blocks only for
   `queue`/`usage`/`providers`; there is no `activeTab === 'logs'` panel. FR-055/FR-060 require cost
   logs, so this panel must be populated (the tab already exists — not a new surface).
2. **"New AI Job" and "Refresh" buttons are inert** — wire to bulk-generate and a data refresh.

---

## 6. Reusable infra (no rebuild needed)

- BullMQ inline/bullmq queue driver + worker registration pattern (ADR-023, Phase 6).
- `lib/crypto.ts` AES-256-GCM for provider-key secrets at rest.
- `Setting` model (groups `ai_prompts`, `ai_provider`) + `services/settings.service.ts`.
- Response envelope, `requirePermission`/`requireCsrf`/`auditLogger`. Permissions `ai.view` +
  `ai.generate` already exist; an `ai.manage` permission (prompts/retry/approve) is the likely
  addition — to confirm at implementation.

---

## 7. Compliance conclusion

- The current `/admin/ai` **structure is blueprint-compatible** — FR-060's four functions map onto the
  existing tabs; nothing in the blueprint contradicts the present layout.
- The blueprint does **not** mandate a Prompts tab/page; it mandates prompt-management *functionality*.
  → Existing layout preserved; prompt editor integrated as the single design-consistent new surface.
- Phase 7 therefore implements **only missing functionality**: backend AI engine (models, queues,
  workers, providers, prompts, logs, validation, review gate, 8 endpoints) + wiring the existing
  AI-Center surfaces + the one integrated prompt editor. No existing UI is restructured.
