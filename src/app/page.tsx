import Link from "next/link";
import { ModeBanner } from "@/components/ModeBanner";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper-50">
      <ModeBanner />
      <div className="mx-auto max-w-5xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-amber">
          Police &amp; Citizen AI Copilot
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-ink-950 sm:text-5xl">
          One pipeline, two very different rooms to stand in.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-800/80">
          A citizen files a report from wherever they are. An officer reviews it from a desk that
          has seen a thousand of these. Same intake, same audit trail, same guardrails — the
          interface just tells the truth about who's using it.
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <Link
            href="/report"
            className="focus-ring group block rounded-sm border border-ink-800/10 bg-white p-8 shadow-sm transition hover:border-signal-amber/40 hover:shadow-md"
          >
            <span className="font-mono text-xs uppercase tracking-wide text-signal-amber">01 — Citizen</span>
            <h2 className="mt-3 font-display text-2xl text-ink-950">File a report</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-800/70">
              Describe what happened. We'll structure it, check it against nearby sensor activity,
              and route it to an officer — with or without a stable connection.
            </p>
            <span className="mt-6 inline-block text-sm font-medium text-signal-amber group-hover:underline">
              Start a report →
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="focus-ring group block rounded-sm border border-ink-800/40 bg-ink-950 p-8 text-paper-50 shadow-sm transition hover:border-signal-amber/60"
          >
            <span className="font-mono text-xs uppercase tracking-wide text-signal-amber">02 — Officer</span>
            <h2 className="mt-3 font-display text-2xl">Open the dashboard</h2>
            <p className="mt-3 text-sm leading-relaxed text-paper-100/70">
              Review incoming cases, see discrepancy flags scored against sensor telemetry, and
              confirm or decline dispatch. Nothing dispatches without you.
            </p>
            <span className="mt-6 inline-block text-sm font-medium text-signal-amber group-hover:underline">
              Enter dashboard →
            </span>
          </Link>
        </div>

        <div className="mt-16 border-t border-ink-800/10 pt-8 text-sm text-ink-800/60">
          <p>
            Built on Mastra (orchestration), Qdrant (spatial-temporal memory), and Enkrypt AI
            (guardrails). Sensor data is simulated for this demo — see the status bar above for
            what's live vs. simulated right now.
          </p>
        </div>
      </div>
    </main>
  );
}
