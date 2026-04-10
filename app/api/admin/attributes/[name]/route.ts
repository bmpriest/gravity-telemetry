import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const patchSchema = z.object({
  description: z.string().min(1).max(2000),
});

type Ctx = { params: Promise<{ name: string }> };

export const PATCH = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { name: encoded } = await ctx.params;
  const name = decodeURIComponent(encoded);
  const body: unknown = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const existing = await prisma.attribute.findUnique({ where: { name } });
  if (!existing) return jsonError(404, "Attribute not found");
  await prisma.attribute.update({ where: { name }, data: { description: parsed.data.description } });
  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { name: encoded } = await ctx.params;
  const name = decodeURIComponent(encoded);

  const inUse = await prisma.subsystemAttribute.findFirst({ where: { attributeName: name } });
  if (inUse) {
    return jsonError(409, "Cannot delete: attribute is in use by subsystems");
  }

  const existing = await prisma.attribute.findUnique({ where: { name } });
  if (!existing) return jsonError(404, "Attribute not found");
  await prisma.attribute.delete({ where: { name } });
  return NextResponse.json({ success: true });
});
