import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const alert = await prisma.alert.findFirst({
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, error: null, content: alert ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
    });
  }
}
