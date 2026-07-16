import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const repo = await getRepository();
  const caseRecord = await repo.getCase(params.id);
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const audit = await repo.listAudit(params.id);
  return NextResponse.json({ case: caseRecord, audit });
}
