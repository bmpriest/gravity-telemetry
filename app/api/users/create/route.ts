import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrigin } from "@/lib/origins";
import { getRandomCharacters } from "@/utils/functions";

async function generateUid(): Promise<string> {
  const uid = getRandomCharacters(12, "numeric");
  const existing = await prisma.user.findUnique({ where: { uid } });
  if (existing) return generateUid();
  return uid;
}

export async function POST() {
  try {
    const uid = await generateUid();
    const accessToken = getRandomCharacters(50);
    const today = new Date().toISOString().slice(0, 10);
    const origin = getOrigin(process.env.NEXT_PUBLIC_BASE_URL ?? "");

    const user = await prisma.user.create({
      data: { uid, accessToken, createdAt: today, lastLoggedIn: today, origin },
    });

    return NextResponse.json({
      success: true,
      error: null,
      content: { ...user, blueprints: [], savedMails: [] },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
    });
  }
}
