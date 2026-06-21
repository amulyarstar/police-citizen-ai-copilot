# Police & Citizen AI Copilot — Product Requirements Document

**Track:** Open Innovation Challenge
**Event:** AI House x Mastra — Round 1, HiDevs Hackathon
**Stack:** Mastra (orchestration) · Qdrant (vector memory) · Enkrypt AI (guardrails)

## 1. Problem statement

Citizens reporting incidents to police face two common failures: complaints get lost in unstructured text with no link to physical evidence, and there's no automated way to catch contradictions between what a citizen reports and what city infrastructure (sensors, cameras) actually recorded. Officers, meanwhile, lack a unified dashboard that surfaces these contradictions before they commit resources.

This system gives citizens and officers a shared AI copilot that intakes complaints, correlates them against spatial-temporal sensor data, flags discrepancies, and routes emergencies — all while enforcing strict guardrails on input safety and output privacy, since this domain handles PII and feeds an immutable legal audit trail.

## 2. Goals

- Let citizens file complaints from a mobile/web app, with or without an active data connection, and without requiring a smartphone at all.
- Give officers a dashboard for dispatch, complaint review, and discrepancy alerts.
- Automatically cross-reference citizen-reported timelines against physical sensor logs near the incident location and time.
- Prevent any AI-initiated real-world action (emergency dispatch) without explicit human officer confirmation.
- Maintain an indefinite, immutable audit trail for legal/court use, separate from time-limited semantic memory.

## 3. System architecture

### 3.1 Client gateways

| Component | Purpose |
|---|---|
| Citizen UI | Mobile/web app for filing complaints and tracking case status. Supports offline drafting — complaints are stored locally and queued for submission when connectivity returns. |
| Officer Dashboard | Internal terminal for dispatch logs, report review, and discrepancy alerts. Also serves as the fallback entry point for citizens without a device — an officer can manually enter a walk-in report here, and it passes through the identical pipeline as a self-service submission. |

### 3.2 Security & compliance layer (Enkrypt AI)

| Component | Purpose |
|---|---|
| Enkrypt AI Input Shield | Scrubs incoming text and blocks prompt injection attempts before requests reach the orchestrator. |
| Enkrypt AI Output Shield | Redacts PII (names, addresses) and filters hallucinated claims before any response reaches a citizen or officer. |

Guardrails apply uniformly regardless of entry point — self-service citizen submissions and officer-entered walk-in reports both pass through the same shields.

### 3.3 Orchestration & core framework (Mastra)

| Component | Purpose |
|---|---|
| Mastra Workflow Engine | State machine handling async steps across the request lifecycle, including a mandatory human-in-the-loop approval step before any emergency dispatch action executes. |
| Mastra Supervisor Agent | Evaluates intent and context, then routes each request to the correct specialized tool. |

### 3.4 Specialized execution layer (Mastra tools)

| Tool | Purpose |
|---|---|
| Complaint Processor Tool | Formats raw citizen text into structured legal complaint templates. Writes the structured complaint, including the reported timeline, into shared workflow memory for downstream tools. |
| Emergency Response Routing Tool | Interfaces with dispatch systems for urgent cases. Requires explicit officer confirmation via the Officer Dashboard before any real dispatch action is sent; the confirmation event is logged to PostgreSQL. |
| Document Ingestion Tool | Chunks and serializes unstructured uploaded files (PDFs, images, evidence). |
| Spatial-Temporal Log Correlation Tool | Queries Qdrant for municipal sensor logs within a 500m radius and matching time window of a reported incident. |
| Discrepancy Analytics Tool | Reads the citizen-reported timeline from shared workflow memory and cross-references it against telemetry retrieved by the Spatial-Temporal tool, flagging contradictions. Writes flagged discrepancies back to PostgreSQL as part of the immutable audit trail. |

### 3.5 Storage & semantic memory layer

| Component | Purpose |
|---|---|
| Qdrant Vector DB | Stores spatial-temporal embeddings of historical cases and infrastructure logs for similarity search. 90-day TTL. |
| PostgreSQL (Relational DB) | System of record for citizen/officer profiles and the immutable court audit trail. Retained indefinitely. |
| Sync Pipeline | Background Mastra worker that mirrors PostgreSQL case updates into Qdrant vector metadata in near real-time. |

## 4. Key design decisions

**Why two Enkrypt shields, not one.** Input-side risk (prompt injection, malicious text) and output-side risk (PII leakage, hallucinated claims) are different failure modes requiring different checks. Separating them keeps each shield's logic focused and auditable.

**Why human-in-the-loop on dispatch.** Emergency Response Routing is the only tool with a real-world physical side effect. The workflow engine blocks execution until an officer explicitly confirms via the dashboard, ensuring the AI never autonomously commits police resources. This confirmation is logged to PostgreSQL.

**Why Discrepancy Analytics needs two inputs.** Flagging a "discrepancy" requires two things to compare: what the citizen said, and what the sensors recorded. The tool reads the former from shared workflow memory (written by the Complaint Processor) and the latter from the Spatial-Temporal tool's output.

**Why dual-memory storage.** Qdrant is optimized for fast similarity search over recent, spatially-indexed data — but isn't meant to hold legally binding records forever. PostgreSQL holds the permanent record. The Sync Pipeline keeps Qdrant's view current without making it the source of truth.

**Why offline support matters.** Citizens may not have reliable mobile data. The Citizen UI queues drafted complaints locally and submits them once connectivity returns, so a weak connection doesn't block reporting.

**Why a no-device fallback matters.** A citizen who has lost their phone still needs a way to file a report. Rather than building new infrastructure (kiosk, IVR), the existing Officer Dashboard serves this purpose — an officer enters the report on the citizen's behalf, and it flows through the same guardrails and pipeline as any other submission.

## 5. Out of scope for Round 1

- Live integration with real municipal sensor networks or dispatch systems (simulated/seeded data used for demo).
- Kiosk or IVR-based filing channels.
- Multi-language support.

## 6. Open questions

- Exact escalation path if an officer repeatedly fails to confirm a time-sensitive dispatch request.
- Retention policy for offline-queued drafts that are never submitted.
