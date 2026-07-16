"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CaseRecord } from "@/lib/types";

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Received", tone: "text-signal-blue" },
  processing: { label: "Being reviewed by the copilot", tone: "text-signal-blue" },
  under_review: { label: "Under officer review", tone: "text-signal-blue" },
  dispatch_pending: { label: "Awaiting officer confirmation for dispatch", tone: "text-signal-amber" },
  dispatch_confirmed: { label: "Dispatch confirmed — help is on the way", tone: "text-signal-green" },
  dispatch_escalated: { label: "Escalated to a supervisor for confirmation", tone: "text-signal-amber" },
  dispatch_declined: { label: "Reviewed — dispatch not needed", tone: "text-ink-800/70" },
  closed: { label: "Closed", tone: "text-ink-800/70" },
};

export default function CaseStatusPage() {
  const params = useParams<{ caseId: string }>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch(`/api/cases/${params.caseId}`);
      if (!active) return;
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setCaseRecord(data.case);
    }
    load();
    const interval = setInterval(load, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [params.caseId]);

  return (
    <main className="min-h-screen bg-paper-50">
      <div className="mx-auto max-w-xl px-6 py-14">
        <Link href="/report" className="font-mono text-xs uppercase tracking-wide text-ink-800/50 hover:text-signal-amber">
          ← File another report
        </Link>
        <h1 className="mt-4 font-display text-3xl text-ink-950">Case status</h1>
        <p className="mt-1 font-mono text-sm text-ink-800/60">{params.caseId}</p>

        {notFound && <p className="mt-8 text-sm text-signal-red">We couldn't find a case with that ID.</p>}

        {caseRecord && (
          <div className="mt-8 space-y-6">
            <div className="rounded-sm border border-ink-800/10 bg-white p-6">
              <p className={`font-medium ${STATUS_COPY[caseRecord.status]?.tone ?? "text-ink-800"}`}>
                {STATUS_COPY[caseRecord.status]?.label ?? caseRecord.status}
              </p>
              <p className="mt-2 text-xs text-ink-800/50">
                Last updated {new Date(caseRecord.updatedAt).toLocaleString()}. This page refreshes automatically.
              </p>
            </div>

            {caseRecord.structuredComplaint && (
              <div className="rounded-sm border border-ink-800/10 bg-paper-100 p-5 text-sm text-ink-800/80">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-800/50">Your report</p>
                <p className="mt-2 italic">"{caseRecord.rawText}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
