import { NextRequest, NextResponse } from "next/server";
import { confirmDispatch } from "@/lib/caseActions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const officerId = typeof body.officerId === "string" && body.officerId.trim() ? body.officerId : "officer-demo";
    const updated = await confirmDispatch(params.id, officerId);
    return NextResponse.json({ case: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to confirm dispatch" }, { status: 400 });
  }
}
