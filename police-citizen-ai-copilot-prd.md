# Police & Citizen AI Copilot — Product Requirements Document

**Track:** Open Innovation Challenge
**Event:** AI House x Mastra — Round 1, HiDevs Hackathon
**Stack:** Mastra (orchestration) · Qdrant (vector memory) · Enkrypt AI (guardrails)

## 1. Problem statement

Citizens reporting incidents to police face two common failures: complaints get lost in unstructured text with no link to physical evidence, and there's no automated way to catch contradictions between what a citizen reports and what city infrastructure (sensors, cameras) actually recorded. Officers, meanwhile, lack a unified dashboard that surfaces these contradictions before they commit resources.

This system gives citizens and officers a shared AI copilot that intakes complaints, correlates them against spatial-temporal sensor data, flags discrepancies, and routes emergencies — all while enforcing strict guardrails on input safety and output privacy, since this domain handles PII and feeds an immutable legal audit trail.

## 2. Target users

**Citizens** filing incident reports — ranging from routine complaints to time-sensitive emergencies. This group is assumed to be diverse in connectivity (some without reliable mobile data), device access (some without a smartphone at all), and language (English is not assumed to be every citizen's first or only language; the Complaint Processor Tool's text-to-template approach is language-agnostic in principle, making multi-language support a natural extension once a translation layer is added, though it is not built in Round 1 — see Section 7).

**Officers and dispatch staff** using the internal dashboard to review complaints, confirm or decline emergency dispatch recommendations, and investigate flagged discrepancies. This group needs fast access to corroborating evidence (sensor telemetry) and a clear, auditable record of every decision they make.

**Auditors and legal reviewers** (a secondary but critical user group) who rely on the immutable PostgreSQL trail — case histories, dispatch confirmations, and discrepancy flags — for court proceedings or internal accountability review, potentially long after the original incident.

## 3. Expected outcomes

- Citizens can file a structured, legally usable complaint in under a few minutes, regardless of connectivity or device access.
- Officers receive emergency dispatch recommendations with supporting context, and retain full decision authority — the system never dispatches without explicit confirmation.
- Contradictions between reported and sensor-recorded timelines are surfaced automatically, with a confidence score, reducing the manual effort needed to cross-check evidence.
- Every safety-relevant decision (dispatch confirmation, discrepancy flag) is permanently and immutably logged, producing a defensible audit trail suitable for legal review.
- The system degrades gracefully under real-world constraints (no connectivity, no device) rather than failing outright.

## 4. Goals

- Let citizens file complaints from a mobile/web app, with or without an active data connection, and without requiring a smartphone at all.
- Give officers a dashboard for dispatch, complaint review, and discrepancy alerts.
- Automatically cross-reference citizen-reported timelines against physical sensor logs near the incident location and time.
- Prevent any AI-initiated real-world action (emergency dispatch) without explicit human officer confirmation.
- Maintain an indefinite, immutable audit trail for legal/court use, separate from time-limited semantic memory.

## 5. System architecture

### 5.1 Client gateways

| Component | Purpose |
|---|---|
| Citizen UI | Mobile/web app for filing complaints and tracking case status. Supports offline drafting — complaints are stored locally and queued for submission when connectivity returns. |
| Officer Dashboard | Internal terminal for dispatch logs, report review, and discrepancy alerts. Also serves as the fallback entry point for citizens without a device — an officer can manually enter a walk-in report here, and it passes through the identical pipeline as a self-service submission. |

### 5.2 Security & compliance layer (Enkrypt AI)

| Component | Purpose |
|---|---|
| Enkrypt AI Input Shield | Scrubs incoming text and blocks prompt injection attempts before requests reach the orchestrator. |
| Enkrypt AI Output Shield | Redacts PII (names, addresses) and filters hallucinated claims before any response reaches a citizen or officer. |

Guardrails apply uniformly regardless of entry point — self-service citizen submissions and officer-entered walk-in reports both pass through the same shields.

### 5.3 Orchestration & core framework (Mastra)

| Component | Purpose |
|---|---|
| Mastra Workflow Engine | State machine handling async steps across the request lifecycle, including a mandatory human-in-the-loop approval step before any emergency dispatch action executes. |
| Mastra Supervisor Agent | Evaluates intent and context, then routes each request to the correct specialized tool. |

### 5.4 Specialized execution layer (Mastra tools)

| Tool | Purpose |
|---|---|
| Complaint Processor Tool | Formats raw citizen text into structured legal complaint templates. Writes the structured complaint, including the reported timeline, into shared workflow memory for downstream tools. |
| Emergency Response Routing Tool | Interfaces with dispatch systems for urgent cases. Requires explicit officer confirmation via the Officer Dashboard before any real dispatch action is sent; the confirmation event is logged to PostgreSQL. |
| Document Ingestion Tool | Chunks and serializes unstructured uploaded files (PDFs, images, evidence). |
| Spatial-Temporal Log Correlation Tool | Queries Qdrant for municipal sensor logs within a 500m radius and matching time window of a reported incident. |
| Discrepancy Analytics Tool | Reads the citizen-reported timeline from shared workflow memory and cross-references it against telemetry retrieved by the Spatial-Temporal tool, flagging contradictions. Writes flagged discrepancies back to PostgreSQL as part of the immutable audit trail. |

### 5.5 Storage & semantic memory layer

| Component | Purpose |
|---|---|
| Qdrant Vector DB | Stores spatial-temporal embeddings of historical cases and infrastructure logs for similarity search. 90-day TTL. |
| PostgreSQL (Relational DB) | System of record for citizen/officer profiles and the immutable court audit trail. Retained indefinitely. |
| Sync Pipeline | Background Mastra worker that mirrors PostgreSQL case updates into Qdrant vector metadata in near real-time. |

### 5.6 Frontend, backend, APIs, and deployment architecture

**Frontend.** Citizen UI is a mobile/web client (responsive web app, deployable as a PWA for offline-first behavior). Officer Dashboard is a separate web client served to internal users only, behind authentication. Both are thin clients — all business logic lives server-side in the Mastra workflow layer.

**Backend.** The Mastra Workflow Engine and Supervisor Agent run as a TypeScript service. Each specialized tool (Complaint Processor, Emergency Response Routing, Document Ingestion, Spatial-Temporal Log Correlation, Discrepancy Analytics) is implemented as a Mastra tool callable by the Supervisor Agent, deployed within the same service boundary for Round 1 to minimize latency between orchestration and execution.

**APIs.** Citizen UI and Officer Dashboard communicate with the backend over authenticated REST/HTTPS endpoints (or WebSocket for live dispatch status updates). All inbound requests pass through the Enkrypt AI Input Shield at the API gateway level before reaching the Mastra Workflow Engine; all outbound responses pass through the Enkrypt AI Output Shield before leaving the service boundary.

**Databases.** Qdrant and PostgreSQL are deployed as managed instances (e.g. Qdrant Cloud, a managed Postgres provider) rather than self-hosted, to reduce operational overhead during the hackathon build phase.

**Integrations.** Municipal sensor data and live dispatch systems are simulated/seeded for Round 1 and Round 2 demo purposes (see Section 7); the architecture is designed so these can be swapped for real integrations behind the same tool interfaces without changing the orchestration layer.

**Deployment.** The backend service, Mastra tools, and sync pipeline are containerized and deployable to a standard cloud environment (e.g. a single container service for the hackathon build, with room to split into independently scaled services post-hackathon). Frontend clients are deployed separately as static/PWA builds.

## 6. Key design decisions

**Why two Enkrypt shields, not one.** Input-side risk (prompt injection, malicious text) and output-side risk (PII leakage, hallucinated claims) are different failure modes requiring different checks. Separating them keeps each shield's logic focused and auditable.

**Why human-in-the-loop on dispatch.** Emergency Response Routing is the only tool with a real-world physical side effect. The workflow engine blocks execution until an officer explicitly confirms via the dashboard, ensuring the AI never autonomously commits police resources. This confirmation is logged to PostgreSQL.

**Why Discrepancy Analytics needs two inputs.** Flagging a "discrepancy" requires two things to compare: what the citizen said, and what the sensors recorded. The tool reads the former from shared workflow memory (written by the Complaint Processor) and the latter from the Spatial-Temporal tool's output.

**Why dual-memory storage.** Qdrant is optimized for fast similarity search over recent, spatially-indexed data — but isn't meant to hold legally binding records forever. PostgreSQL holds the permanent record. The Sync Pipeline keeps Qdrant's view current without making it the source of truth.

**Why offline support matters.** Citizens may not have reliable mobile data. The Citizen UI queues drafted complaints locally and submits them once connectivity returns, so a weak connection doesn't block reporting.

**Why a no-device fallback matters.** A citizen who has lost their phone still needs a way to file a report. Rather than building new infrastructure (kiosk, IVR), the existing Officer Dashboard serves this purpose — an officer enters the report on the citizen's behalf, and it flows through the same guardrails and pipeline as any other submission.

### 6.1 Confidence scoring and escalation logic

**How `confidence_score` is calculated.** The Discrepancy Analytics Tool derives its confidence score from four measurable factors: the time gap between the citizen's reported time and the sensor-recorded time, the location gap between the reported address and the sensor's detection point, whether the type of event reported is consistent with what the sensor detected, and the reliability/completeness of the underlying sensor data. These combine into a single score so that low-quality or ambiguous sensor data lowers confidence rather than producing a falsely certain flag. The score is a prioritization aid for human reviewers, not a verdict — it does not assert that the citizen is lying.

**What happens if an officer doesn't respond to a dispatch confirmation.** Confirmation requests carry a timeout window scaled to urgency. If the assigned officer doesn't respond within that window, the request escalates to a backup officer or supervisor — it is never auto-approved by the system. Every escalation step (who was notified, when, and the outcome) is logged to the same PostgreSQL audit trail as the original confirmation request. The citizen-facing status updates to "under review" during escalation so the reporter isn't left without feedback.

## 7. Out of scope for Round 1

- Live integration with real municipal sensor networks or dispatch systems (simulated/seeded data used for demo).
- Kiosk or IVR-based filing channels.
- Multi-language support.

## 8. Open questions

- Exact escalation path if an officer repeatedly fails to confirm a time-sensitive dispatch request.
- Retention policy for offline-queued drafts that are never submitted.
