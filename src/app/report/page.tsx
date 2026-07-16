"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModeBanner } from "@/components/ModeBanner";
import type { CaseRecord } from "@/lib/types";

interface Locality {
  id: string;
  name: string;
}
interface DemoComplaint {
  label: string;
  localityId: string;
  rawText: string;
}

export default function ReportPage() {
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [demoComplaints, setDemoComplaints] = useState<DemoComplaint[]>([]);
  const [localityId, setLocalityId] = useState("");
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CaseRecord | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/localities")
      .then((r) => r.json())
      .then((data) => {
        setLocalities(data.localities);
        setDemoComplaints(data.demoComplaints);
        if (data.localities[0]) setLocalityId(data.localities[0].id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setBlockedReason(null);
    setResult(null);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, localityId }),
      });
      const data = await res.json();
      if (res.status === 422 && data.blocked) {
        setBlockedReason(data.reason ?? "This submission was blocked by the input guardrail.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data.case);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function useExample(demo: DemoComplaint) {
    setLocalityId(demo.localityId);
    setRawText(demo.rawText);
  }

  return (
    <main className="min-h-screen bg-paper-50">
      <ModeBanner />
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="font-mono text-xs uppercase tracking-wide text-ink-800/50 hover:text-signal-amber">
          ← Back
        </Link>
        <h1 className="mt-4 font-display text-3xl text-ink-950">File a report</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-800/70">
          Describe what happened in your own words. There's no wrong way to write this — we'll
          structure it on our end.
        </p>

        {demoComplaints.length > 0 && !result && (
          <div className="mt-6 rounded-sm border border-dashed border-ink-800/20 bg-paper-100 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-800/50">
              Demo shortcuts (for showcasing the pipeline)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {demoComplaints.map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => useExample(demo)}
                  className="focus-ring rounded-sm border border-ink-800/20 bg-white px-3 py-1.5 text-xs text-ink-800 hover:border-signal-amber/50"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!result && (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wide text-ink-800/60">
                Where did this happen?
              </label>
              <select
                value={localityId}
                onChange={(e) => setLocalityId(e.target.value)}
                required
                className="focus-ring mt-2 w-full rounded-sm border border-ink-800/20 bg-white px-3 py-2.5 text-sm"
              >
                {localities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wide text-ink-800/60">
                What happened?
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                required
                minLength={5}
                rows={7}
                placeholder="e.g. Someone broke the window of my car around 8pm last night, outside my apartment..."
                className="focus-ring mt-2 w-full rounded-sm border border-ink-800/20 bg-white px-3 py-2.5 text-sm leading-relaxed"
              />
            </div>

            {error && <p className="text-sm text-signal-red">{error}</p>}
            {blockedReason && (
              <div className="rounded-sm border border-signal-red/30 bg-signal-red/5 p-4 text-sm text-signal-red">
                This submission couldn't be processed: {blockedReason}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="focus-ring rounded-sm bg-ink-950 px-6 py-3 text-sm font-medium text-paper-50 transition hover:bg-ink-800 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </form>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-sm border border-signal-green/30 bg-signal-green/5 p-5">
              <p className="font-mono text-xs uppercase tracking-wide text-signal-green">Report received</p>
              <p className="mt-2 text-sm text-ink-800">
                Case ID <span className="font-mono font-semibold">{result.id}</span> — status:{" "}
                <span className="font-medium">{result.status.replace(/_/g, " ")}</span>
              </p>
            </div>

            {result.structuredComplaint && (
              <div className="rounded-sm border border-ink-800/10 bg-white p-5 text-sm">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-800/50">How we read it</p>
                <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
                  <dt className="text-ink-800/60">Incident type</dt>
                  <dd className="capitalize">{result.structuredComplaint.incidentType.replace(/_/g, " ")}</dd>
                  <dt className="text-ink-800/60">Urgency</dt>
                  <dd className="capitalize">{result.structuredComplaint.urgency}</dd>
                  <dt className="text-ink-800/60">Reported time</dt>
                  <dd>{new Date(result.structuredComplaint.reportedTime).toLocaleString()}</dd>
                  <dt className="text-ink-800/60">Location</dt>
                  <dd>{result.structuredComplaint.reportedLocationText}</dd>
                </dl>
              </div>
            )}

            <Link
              href={`/report/${result.id}`}
              className="focus-ring inline-block text-sm font-medium text-signal-amber hover:underline"
            >
              Track this case's status →
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setRawText("");
              }}
              className="focus-ring ml-6 text-sm text-ink-800/60 hover:text-ink-950"
            >
              File another report
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
