import { NextRequest, NextResponse } from "next/server";
import { escalateDispatch } from "@/lib/caseActions";

export const dynamic = "force-dynamic";

// Demo convenience: PRD 6.1 describes a real timeout-based escalation ("if the
// assigned officer doesn't respond within the timeout window, the request
// escalates to a backup officer or supervisor"). Implementing an actual
// timer/scheduler is out of scope for this build, but the resulting state
// transition and audit entry are real — this route lets you trigger the same
// transition on demand during a demo instead of waiting out the timeout.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const escalatedToId =
      typeof body.escalatedToId === "string" && body.escalatedToId.trim() ? body.escalatedToId : "supervisor-demo";
    const updated = await escalateDispatch(params.id, escalatedToId);
    return NextResponse.json({ case: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to escalate dispatch" }, { status: 400 });
  }
}
