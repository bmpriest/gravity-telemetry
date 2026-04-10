import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

export const DELETE = withErrorHandler(
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => {
    const sessionUser = await requireUser();
    const { id } = await ctx.params;

    const fleet = await prisma.fleet.findFirst({
      where: { id, userId: sessionUser.id },
      select: { id: true },
    });
    if (!fleet) return jsonError(404, "Fleet not found");

    await prisma.fleet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }
);
