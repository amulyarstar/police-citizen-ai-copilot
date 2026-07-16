# Police & Citizen AI Copilot

Complaint intake → sensor-data correlation → confidence-scored discrepancy
flags → human-confirmed dispatch. Built on [Mastra](https://mastra.ai)
(agent/tool orchestration), [Qdrant](https://qdrant.tech) (spatial-temporal
sensor memory), [Enkrypt AI](https://enkryptai.com) (guardrails), and
Postgres (immutable audit trail).

Implements the five tools from `police-citizen-ai-copilot-prd.md`:
Complaint Processor, Spatial-Temporal Log Correlation, Discrepancy Analytics,
Emergency Response Routing, and Document Ingestion.

## Quickstart (zero config)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. That's it — no API keys, no database signup.
The app runs in **full demo mode**:

| Piece | Real | Demo-mode fallback |
|---|---|---|
| Case storage & audit log | Postgres (`DATABASE_URL`) | local SQLite file in `.data/` |
| Sensor correlation | Qdrant (`QDRANT_URL`) | in-memory store, auto-seeded with simulated sensor data |
| Complaint extraction | Mastra Agent + Claude/GPT (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) | deterministic heuristic parser |
| Guardrails | Enkrypt AI (`ENKRYPT_API_KEY`) | regex-based mock shield |

The status bar at the top of every page tells you exactly which mode you're
in. Add real credentials to `.env.local` any time — each one independently
upgrades one piece, nothing else needs to change. See `.env.example`.

**Ready to actually deploy it and show someone? See [DEPLOY.md](./DEPLOY.md).**
**Prepping to explain design decisions to a technical audience? See [PITCH_NOTES.md](./PITCH_NOTES.md).**

## Try the golden-path demo

The citizen form (`/report`) has three one-click example buttons, each paired
with hand-placed simulated sensor data so the discrepancy engine produces an
interesting, reproducible result:

1. **Corroborated** — noise complaint matched by a nearby acoustic sensor.
2. **Significant discrepancy** — a reported theft, but the nearest sensor
   recorded something that points to a different kind of incident.
3. **Emergency** — high-urgency report that requests dispatch and needs
   officer confirmation on `/dashboard` before anything is "sent."

## Architecture

```
src/
  mastra/
    tools/            Complaint Processor, Spatial-Temporal Correlation,
                       Discrepancy Analytics, Emergency Response Routing,
                       Document Ingestion — real @mastra/core createTool()
    agents/
      supervisor.ts    Real Mastra Agent wrapping all five tools (for a
                       conversational interface or `npx mastra dev` Studio)
  lib/
    pipeline.ts        The actual request path: calls the five tools in a
                       fixed sequence + both guardrail shields, writing every
                       step to the audit trail. See PITCH_NOTES.md for why
                       this is deterministic rather than agent-routed.
    caseActions.ts     confirmDispatch / declineDispatch / escalateDispatch —
                       the only code paths that can move a case out of
                       "dispatch_pending"
    db/                Postgres + SQLite repository implementations
    vectorstore/        Qdrant + in-memory implementations
    guardrails/         Enkrypt AI + mock implementations
    llm/structureComplaint.ts   Real Mastra Agent + heuristic fallback
    seedSensors.ts      Simulated sensor dataset generator
  app/
    report/             Citizen intake form + case status tracker
    dashboard/           Officer dashboard: case list, discrepancy detail,
                         dispatch confirm/decline/escalate, audit trail
    api/                 REST routes calling lib/pipeline.ts and lib/caseActions.ts
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` / `npm start` — production build + serve
- `npm run seed` — populate a **real Qdrant** instance with the simulated
  sensor dataset (only needed once `QDRANT_URL` is set — the in-memory
  fallback auto-seeds itself on startup instead)

## What's simplified for this build (and why)

See [PITCH_NOTES.md](./PITCH_NOTES.md) for the full list with reasoning —
short version: geocoding is a fixed locality dropdown instead of a live
geocoder, dispatch confirmation is modeled as explicit Postgres state instead
of Mastra's native workflow suspend/resume, and real sensor integration is
simulated data (which the PRD itself scopes out of Round 1).
