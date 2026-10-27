---
id: knowledge-directory-template
title: Project Knowledge Index (Template)
description: >
  Canonical template for the AgenticLab knowledge index. This file lives in
  `system/knowledge/index.md` as part of the scaffold. A runtime/delivery
  workspace contains a populated COPY at `AgenticLab/knowledge/index.md`.
  The populated index grows as durable knowledge is promoted from candidates.
collection: project-knowledge
scope: template
status: active
recorded: 2026-10-22
---

# AgenticLab Project Knowledge Index — Template

## Purpose

This directory holds **durable, source-linked, user-approved project knowledge** — not session logs, plan checkpoints, or raw dialogue. At scaffold time it is empty or contains only this template. It grows as delivery workflows promote candidate observations into approved records.

**Key rule:** A record only becomes durable after explicit user approval through the `promoteKnowledgeBatch` adapter tool. The agent never self-authorizes durable knowledge.

## Location (runtime)

In any workspace initialized from this scaffold, the actual populated index lives at:

```text
AgenticLab/knowledge/index.md
```

This canonical template (`system/knowledge/index.md`) is **read-only**. Promoted records are written into the initialized workspace, not here.

## Record lifecycle

```text
observation (transient)
  → candidate (staged in knowledge/_candidates/, emits candidate_staged)
  → active (promoted via promoteKnowledgeBatch, emits decision_knowledge)
  → stale/inactive/superseded (updated via approved edits)
```

- **Candidate** → proposal only, not truth. Staged in `AgenticLab/knowledge/_candidates/`.
- **Active** → durable record. Listed in `index.md`. Retrieved via `readKnowledgeRecords`.
- **Stale / superseded** → retired but kept for provenance.

## Growth model

- **During `/plan`**: agent may surface candidates from source inspection
- **During `/implement`**: agent may surface additional candidates
- **During `/premortem`**: final candidate consolidation
- **At approval**: `promoteKnowledgeBatch` promotes candidates → active → `index.md` updated
- **The index grows organically**; you do not pre-populate it with project knowledge at scaffold time

## Template / empty state

When a workspace is first initialized, the knowledge directory may contain:

```text
AgenticLab/knowledge/
  INDEX.md            # this template
  _candidates/        # staging area for candidate records
```

No category/ subdirectories or .md record files exist until the first candidate is promoted.

## Retrieval trigger integration

Before any source inspection, scan `AgenticLab/knowledge/INDEX.md` trigger terms against the current task. If a term matches, call `readKnowledgeRecords` with the record `id` **before** source inspection. Only after the tool responds should you verify claims against current source.

## Scope boundary

- ✅ `AgenticLab/knowledge/` — durable knowledge records (promoted only)
- ❌ `AgenticLab/implementation-logs/` — delivery logs, not knowledge
- ❌ `data/`, `.env` — never accessed

## Related

- Adapter: `system/adapters/pi/knowledge-capture-tools.mjs` (readKnowledgeRecords, stageCandidates, promoteKnowledgeBatch)
- Prompts: `prompts/delivery/plan.md` Step 0, `prompts/delivery/implement.md`, `prompts/delivery/premortem.md`
- Backlog: C02-knowledge-lifecycle.md, retrieval-trigger-design.md
