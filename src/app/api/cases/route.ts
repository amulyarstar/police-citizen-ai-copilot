import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = await getRepository();
  const cases = await repo.listCases();
  return NextResponse.json({ cases, backend: repo.backend() });
}
