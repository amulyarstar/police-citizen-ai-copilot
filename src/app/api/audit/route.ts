import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const repo = await getRepository();
  const caseId = req.nextUrl.searchParams.get("caseId") ?? undefined;
  const audit = await repo.listAudit(caseId);
  return NextResponse.json({ audit });
}
