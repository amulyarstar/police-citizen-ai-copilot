# Pitch notes: architecture decisions, problems faced, and anticipated questions

Written for explaining this build to a technical audience (Google SWEs,
Mastra's team) — organized as decisions + reasoning + honest tradeoffs,
not a feature list.

## 30-second framing

A citizen files a report → it's structured, checked against nearby municipal
sensor data, and confidence-scored for discrepancies → an officer sees all of
that on a dashboard and is the only one who can confirm a dispatch. Five
Mastra tools, one audit trail, two guardrail shields (input + output),
everything logged. The interesting engineering isn't the happy path — it's
what happens at the edges: ambiguous sensor data, no LLM key, no database,
a guardrail outage, a citizen who never gets an officer response.

## Architecture decisions, and why

### 1. Deterministic pipeline, not agentic routing, for the request path

The Supervisor Agent (`mastra/agents/supervisor.ts`) is a real Mastra `Agent`
wrapping all five tools — but the actual citizen-facing request path
(`lib/pipeline.ts`) calls those same five tools **directly, in a fixed
order**, not through the agent's tool-choice loop.

**Why**: a citizen complaint always needs the same five steps in the same
order. Letting an LLM decide "should I run correlation before or after
structuring the complaint" adds latency, cost, and a new failure mode
(the agent occasionally choosing a different order or skipping a step) for
zero benefit — there's no genuine decision to make. The Agent definition
still exists and shares the exact same tool implementations, so it's ready
for the place agentic routing *is* useful: a conversational "ask the copilot
about case #123" interface, or Mastra Studio (`npx mastra dev`) for
inspecting tool calls during development.

**Anticipated pushback**: "Isn't that just a regular pipeline with extra
steps?" — yes, deliberately. The PRD's actual requirement is reproducible,
auditable execution, not open-ended reasoning. We'd reach for the agentic
version if the product needed to handle genuinely novel request types.

### 2. Human confirmation modeled as explicit DB state, not Mastra workflow suspend/resume

Mastra has a native primitive for exactly this — `suspend()`/`resume()` in
`createWorkflow`. We evaluated it and didn't use it for the dispatch
confirmation gate.

**Why**: suspend/resume needs a persisted workflow-snapshot store to survive
between the suspend call and the resume call, which in this app happens
across two completely separate HTTP requests, potentially minutes apart, on
serverless functions with no guaranteed warm state. Mastra's default storage
(LibSQL file) doesn't persist reliably across Vercel function invocations;
a production-grade version would need `@mastra/pg` or a hosted LibSQL
(Turso) as the workflow storage backend specifically. For a hackathon
timeline, we modeled the same guarantee — *nothing dispatches without an
explicit officer action* — as an explicit `status` column
(`dispatch_pending` → `dispatch_confirmed`/`declined`/`escalated`) with every
transition written to the immutable audit log. Functionally identical
guarantee, zero additional infrastructure.

**What we'd do with more time**: swap in real Mastra workflow suspend/resume
backed by `@mastra/pg`, since Postgres is already in the stack — this would
also unlock Mastra's built-in workflow observability/tracing for free.

### 3. Progressive-enhancement "demo mode" for every external dependency

Every integration (Postgres, Qdrant, Enkrypt AI, an LLM) has a working
fallback: local SQLite, in-memory + auto-seeded vector search, a regex-based
guardrail, a heuristic complaint parser. Zero external accounts needed to run
the whole pipeline end-to-end.

**Why**: this was a deliberate bet that a fully-working demo with weaker
components beats a partially-working demo with strong components — you're
never blocked by someone else's API key, free-tier signup friction, or a
network hiccup mid-presentation. Every response also carries a visible
`mode` field (`heuristic` vs `llm`, `mock` vs `enkrypt`) so nothing pretends
to be more real than it is — see the status bar at the top of every page.

**Tradeoff we accepted**: this roughly doubles the surface area of
`lib/` (every integration is two implementations behind one interface). Worth
it for a demo-critical app; wouldn't necessarily do this for an internal
tool with a known, stable environment.

### 4. Qdrant is used for structured geo/time filtering, not semantic similarity, in the Round-1 correlation query

The Spatial-Temporal Log Correlation tool's actual job — "sensor events
within 500m and a matching time window" — is a filter operation
(`geo_radius` + payload range filter), not a similarity search. We use
Qdrant's native filtering for that. Each point also carries a small
deterministic 8-dimension feature vector (lat/lon/time-of-day/day-of-week/
incident-type/reliability — see `lib/embeddings.ts`), computed without
calling an embeddings API, so the same collection is ready for genuine
similarity search later ("find historical cases like this one" — PRD 5.5)
without a schema migration.

**Anticipated pushback from Mastra/vector-DB people**: "Why not just use
Postgres with PostGIS for this, then?" — fair, and for the Round-1 filter-only
query alone, PostGIS would work too. We chose Qdrant because (a) the PRD
specifies it, and (b) the similarity-search use case it unlocks — "have we
seen a pattern like this before" — isn't something PostGIS does well, and we
wanted one store that serves both without a second migration later.

### 5. Locality dropdown instead of live geocoding

Citizens pick from a fixed list of Bengaluru localities instead of typing a
free-text address. This avoids a geocoding API dependency entirely.

**Why**: geocoding is a solved problem with several good providers, but
integrating one is pure plumbing that doesn't teach anything about the
actual product (discrepancy detection, guardrails, human-confirmed dispatch)
— it was the least interesting thing to spend hackathon time on. The
locality IDs are also what the simulated sensor dataset is generated around,
which keeps demo scenarios reproducible.

**What we'd do next**: swap in Google Maps Places Autocomplete or Mapbox
geocoding — this is a genuinely drop-in replacement, since `complaintProcessor.ts`
already isolates "resolve location text → lat/lon" behind one function call.

## Real problems we hit (found via testing, not hypothetical)

These are worth mentioning specifically if asked "what was hard" — they're
concrete, not generic hackathon-retro answers.

**Bug 1 — reported-time resolution vs. sensor-data timing.** Early on, a
demo complaint said "...around 9pm..." and the heuristic time parser
correctly resolved that to today's 9pm — but the golden-path sensor data had
been placed relative to "now" (whatever time the demo happened to run). If
you demo this at 11am, "9pm" is ten hours away from "now," so a report that
was supposed to visibly corroborate against nearby sensor data instead
returned zero matches. The bug wasn't in the time-parsing logic — resolving
"9pm" to today's 9pm is *correct* behavior for a real report — it was a
mismatch between the demo fixture data and how the extractor actually
behaves. Fix: demo fixtures were rewritten to avoid depending on wall-clock
alignment. This is a good example of why testing the actual pipeline output,
not just unit-testing each tool in isolation, matters — the bug only showed
up at the integration level.

**Bug 2 — a real scoring-semantics bug in the Discrepancy Analytics tool.**
The original confidence formula treated a sensor with no specific
classification (e.g., a motion sensor that just saw "normal pedestrian
activity") as roughly *half-consistent* with any reported incident type. In
one test case, that produced a **"corroborated" verdict for a theft report**
where the actual sensor evidence was "nothing specific was detected" — which
overclaims what the sensor establishes. A generic sensor seeing nothing
unusual doesn't confirm a theft happened, but it also doesn't rule one out.
Fixed by requiring an *explicit* matching classification for "corroborated"
and an *explicit* conflicting classification for a discrepancy verdict;
"no classification" now correctly falls through to `insufficient_data`
regardless of how close in time/space the sensor is. This is the more
consequential of the two bugs — it's the exact kind of overconfident-AI
mistake that would matter most in a system whose whole premise is helping
humans catch discrepancies without asserting certainty it doesn't have.

**What both bugs have in common**: they only surfaced by actually running
complaints through the live pipeline and reading the output, not by
eyeballing the code. Worth mentioning if asked about testing strategy —
there's no unit test suite here yet (hackathon timeline), but there should be
one covering exactly these edge cases before this goes anywhere near real
citizen data.

## What we'd change before this touches real production data

Said plainly, since a technical audience will ask:

- **Real workflow durability** (Mastra suspend/resume + `@mastra/pg`)
  instead of the explicit-status-column approach.
- **A real test suite** around the discrepancy scoring logic specifically —
  it's the part of the system most likely to encode a subtle wrong
  assumption, per bug #2 above.
- **Real geocoding** instead of a fixed locality list.
- **Rate limiting and abuse protection** on the citizen-facing intake
  endpoint — currently open.
- **Row-level access control** — right now any officer session can see any
  case; a real deployment needs jurisdiction-scoped access.
- **An actual legal/privacy review** of what gets logged where, especially
  around the immutable audit table — "immutable" is a strength for
  accountability and a liability for GDPR/right-to-erasure-style requirements
  depending on jurisdiction, and that tension needs a real answer, not a
  schema comment.

## What's next (roadmap, if this continues past the hackathon)

1. Real Mastra workflow suspend/resume for dispatch confirmation.
2. File upload UI wired to the (already-built) Document Ingestion tool.
3. Historical-case similarity search using the spatio-temporal vectors
   already being stored (schema supports it today, query doesn't exist yet).
4. Officer-side authentication and jurisdiction scoping.
5. A real evaluation set for the discrepancy scorer — labeled examples with
   known-correct verdicts, so scoring changes can be regression-tested
   instead of eyeballed.
