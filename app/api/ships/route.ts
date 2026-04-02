import { NextResponse } from "next/server";
import { data, difficulty } from "@/data/ships";

export async function GET() {
  return NextResponse.json({ data, difficulty });
}
