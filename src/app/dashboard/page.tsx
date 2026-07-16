"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ModeBanner } from "@/components/ModeBanner";
import type { AuditLogEntry, CaseRecord } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-signal-blue/15 text-signal-blue",
  processing: "bg-signal-blue/15 text-signal-blue",
  under_review: "bg-signal-blue/15 text-signal-blue",
  dispatch_pending: "bg-signal-amber/15 text-signal-amber",
  dispatch_confirmed: "bg-signal-green/15 text-signal-green",
  dispatch_escalated: "bg-signal-amber/20 text-signal-amber",
  dispatch_declined: "bg-ink-800/10 text-ink-800/60",
  closed: "bg-ink-800/10 text-ink-800/60",
};

const VERDICT_STYLES: Record<string, string> = {
  corroborated: "border-signal-green text-signal-green",
  minor_discrepancy: "border-signal-amber text-signal-amber",
  significant_discrepancy: "border-signal-red text-signal-red",
  insufficient_data: "border-ink-700/40 text-ink-700/60",
};

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ case: CaseRecord; audit: AuditLogEntry[] } | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    setCases(data.cases);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/cases/${id}`);
    const data = await res.json();
    setDetail(data);
  }, []);

  useEffect(() => {
    loadList();
    const interval = setInterval(loadList, 8000);
    return () => clearInterval(interval);
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function act(action: "confirm-dispatch" | "decline-dispatch" | "escalate-dispatch") {
    if (!selectedId) return;
    setActionPending(true);
    try {
      await fetch(`/api/cases/${selectedId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerId: "officer-demo" }),
      });
      await loadDetail(selectedId);
      await loadList();
    } finally {
      setActionPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-950 text-paper-50">
      <ModeBanner />
      <div className="border-b border-paper-50/10 px-6 py-5">
        <Link href="/" className="font-mono text-xs uppercase tracking-wide text-paper-50/40 hover:text-signal-amber">
          ← Back
        </Link>
        <h1 className="mt-2 font-display text-2xl">Officer Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1fr]">
        {/* Case list */}
        <div className="border-r border-paper-50/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-paper-50/10 text-xs uppercase tracking-wide text-paper-50/40">
                <th className="px-4 py-3 font-mono">Case</th>
                <th className="px-4 py-3">Incident</th>
                <th className="px-4 py-3">Verdict</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer border-b border-paper-50/5 transition hover:bg-paper-50/5 ${
                    selectedId === c.id ? "bg-paper-50/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-paper-50/70">{c.id}</td>
                  <td className="px-4 py-3 capitalize">
                    {c.structuredComplaint?.incidentType.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.discrepancy ? (
                      <span
                        className={`rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                          VERDICT_STYLES[c.discrepancy.verdictLabel]
                        }`}
                      >
                        {c.discrepancy.verdictLabel.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-paper-50/30">pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-sm px-2 py-0.5 text-[11px] capitalize ${STATUS_STYLES[c.status] ?? ""}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-paper-50/40">
                    No cases yet. Submit a report from the citizen intake form to see one here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        <div className="bg-paper-50 text-ink-950">
          {!detail && (
            <div className="flex h-full items-center justify-center p-12 text-center text-ink-800/40">
              Select a case to review discrepancy details and confirm dispatch.
            </div>
          )}

          {detail && (
            <div className="p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-mono text-sm text-ink-800/60">{detail.case.id}</h2>
                <span className={`rounded-sm px-2 py-0.5 text-[11px] capitalize ${STATUS_STYLES[detail.case.status] ?? ""}`}>
                  {detail.case.status.replace(/_/g, " ")}
                </span>
              </div>

              <p className="mt-4 rounded-sm border border-ink-800/10 bg-white p-4 text-sm italic text-ink-800/80">
                "{detail.case.rawText}"
              </p>

              {detail.case.structuredComplaint && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-ink-800/50">Incident type</dt>
                  <dd className="capitalize">{detail.case.structuredComplaint.incidentType.replace(/_/g, " ")}</dd>
                  <dt className="text-ink-800/50">Urgency</dt>
                  <dd className="capitalize">{detail.case.structuredComplaint.urgency}</dd>
                  <dt className="text-ink-800/50">Reported time</dt>
                  <dd>{new Date(detail.case.structuredComplaint.reportedTime).toLocaleString()}</dd>
                  <dt className="text-ink-800/50">Location</dt>
                  <dd>{detail.case.structuredComplaint.reportedLocationText}</dd>
                  <dt className="text-ink-800/50">Extraction mode</dt>
                  <dd className="capitalize">{detail.case.structuredComplaint.extractionMode}</dd>
                </dl>
              )}

              {/* Discrepancy evidence tag */}
              {detail.case.discrepancy && (
                <div className="mt-6 rounded-sm border border-dashed border-ink-800/25 bg-paper-100 p-5">
                  <div className="flex items-start justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-ink-800/50">
                      Discrepancy analysis
                    </p>
                    <span
                      className={`stamp rounded border-2 px-2 py-0.5 font-display text-sm font-semibold uppercase tracking-wide ${
                        VERDICT_STYLES[detail.case.discrepancy.verdictLabel]
                      }`}
                    >
                      {detail.case.discrepancy.verdictLabel.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-800/80">{detail.case.discrepancy.explanation}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <Factor label="Time gap" value={detail.case.discrepancy.factors.timeGapScore} />
                    <Factor label="Location gap" value={detail.case.discrepancy.factors.locationGapScore} />
                    <Factor label="Type match" value={detail.case.discrepancy.factors.typeConsistencyScore} />
                    <Factor label="Sensor reliability" value={detail.case.discrepancy.factors.sensorReliabilityScore} />
                  </div>
                  <p className="mt-3 font-mono text-xs text-ink-800/50">
                    Confidence score: {detail.case.discrepancy.confidenceScore}
                  </p>
                </div>
              )}

              {detail.case.correlation && detail.case.correlation.matchedEvents.length > 0 && (
                <div className="mt-6">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-ink-800/50">
                    Correlated sensor events ({detail.case.correlation.matchedEvents.length})
                  </p>
                  <ul className="mt-2 space-y-2">
                    {detail.case.correlation.matchedEvents.map((e) => (
                      <li key={e.id} className="rounded-sm border border-ink-800/10 bg-white p-3 text-xs">
                        <span className="font-medium">{e.description}</span>
                        <span className="ml-2 text-ink-800/50">
                          {e.distanceMeters}m away · {e.timeGapMinutes}min gap · reliability {e.reliability}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dispatch actions */}
              {detail.case.status === "dispatch_pending" && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    disabled={actionPending}
                    onClick={() => act("confirm-dispatch")}
                    className="focus-ring rounded-sm bg-signal-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Confirm dispatch
                  </button>
                  <button
                    disabled={actionPending}
                    onClick={() => act("decline-dispatch")}
                    className="focus-ring rounded-sm border border-ink-800/20 px-4 py-2 text-sm font-medium text-ink-800 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    disabled={actionPending}
                    onClick={() => act("escalate-dispatch")}
                    className="focus-ring rounded-sm border border-signal-amber/40 px-4 py-2 text-sm font-medium text-signal-amber disabled:opacity-50"
                    title="Simulates the PRD 6.1 confirmation-timeout escalation path"
                  >
                    Simulate escalation (timeout)
                  </button>
                </div>
              )}

              {/* Audit trail */}
              <div className="mt-8 border-t border-ink-800/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-800/50">
                  Audit trail (immutable)
                </p>
                <ul className="mt-3 space-y-2 font-mono text-xs text-ink-800/70">
                  {detail.audit.map((entry) => (
                    <li key={entry.id} className="flex gap-3">
                      <span className="shrink-0 text-ink-800/40">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                      <span>
                        {entry.eventType.replace(/_/g, " ")} — <span className="text-ink-800/40">{entry.actorId}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Factor({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-ink-800/10 bg-white p-2">
      <p className="text-ink-800/50">{label}</p>
      <p className="font-mono text-sm font-semibold text-ink-950">{value.toFixed(2)}</p>
    </div>
  );
}
