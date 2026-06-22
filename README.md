# Police & Citizen AI Copilot

A multi-agent AI system for citizen complaint intake, officer dispatch support, and incident verification — built for the **HiDevs x Mastra Hackathon 2026**, Open Innovation Challenge.

## Stack

- **Mastra** — agent orchestration, workflows, tool calling
- **Qdrant** — vector storage for spatial-temporal semantic memory
- **Enkrypt AI** — input/output guardrails, PII redaction, hallucination detection

## What it does

Citizens file incident reports through a mobile/web app, even with poor connectivity. Officers review, dispatch, and verify reports through an internal dashboard. In between, an AI layer:

- Structures raw complaint text into legal templates
- Correlates citizen-reported timelines against real municipal sensor data within a 500m radius
- Flags contradictions between what was reported and what sensors recorded, with a confidence score
- Routes emergency dispatch requests — but never executes them without explicit human officer confirmation

Every action that touches the real world (dispatch) or flags a discrepancy is logged to an immutable PostgreSQL audit trail, separate from the time-limited semantic memory in Qdrant.

## Core design principle

The AI proposes, correlates, and flags. A human officer always holds final authority over real-world actions, and every decision point is logged for legal accountability.

## Contents

- [`police-citizen-ai-copilot-prd.md`](./police-citizen-ai-copilot-prd.md) — full Product Requirements Document, including architecture breakdown and design rationale
- Architecture diagram (PNG) — exported from HiDevs Architecture Copilot

## Architecture overview

**Client Gateways** → **Enkrypt AI Input Shield** → **Mastra Workflow Engine ↔ Mastra Supervisor Agent** → five specialized tools (Complaint Processor, Emergency Response Routing, Document Ingestion, Spatial-Temporal Log Correlation, Discrepancy Analytics) → **Qdrant / PostgreSQL** storage layer → **Enkrypt AI Output Shield** → back to Client Gateways.

See the PRD for full details on each component and the reasoning behind key design decisions (dual Enkrypt shields, human-in-the-loop dispatch confirmation, dual-memory storage, offline and no-device fallbacks). Includes confidence scoring and escalation logic documented in the PRD.

## Author

Built solo for Round 1 of the HiDevs x Mastra Hackathon 2026.
