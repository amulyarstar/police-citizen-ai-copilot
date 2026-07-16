import { NextResponse } from "next/server";
import { BENGALURU_LOCALITIES } from "@/lib/localities";
import { DEMO_COMPLAINTS } from "@/lib/seedSensors";

export async function GET() {
  return NextResponse.json({ localities: BENGALURU_LOCALITIES, demoComplaints: DEMO_COMPLAINTS });
}
