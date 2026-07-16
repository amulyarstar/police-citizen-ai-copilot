import { NextRequest, NextResponse } from "next/server";
import { runComplaintPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { citizenId, rawText, localityId } = body ?? {};

    if (typeof rawText !== "string" || rawText.trim().length < 5) {
      return NextResponse.json({ error: "rawText is required (min 5 characters)" }, { status: 400 });
    }
    if (typeof localityId !== "string") {
      return NextResponse.json({ error: "localityId is required" }, { status: 400 });
    }

    const result = await runComplaintPipeline({
      citizenId: typeof citizenId === "string" && citizenId.trim() ? citizenId : `citizen-${Date.now()}`,
      rawText,
      localityId,
    });

    if (result.blocked) {
      return NextResponse.json(
        { blocked: true, reason: result.blockReason, case: result.case },
        { status: 422 }
      );
    }

    return NextResponse.json({ case: result.case }, { status: 201 });
  } catch (err: any) {
    console.error("[api/complaints] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
