import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const attributeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body: unknown = await req.json();
  const parsed = attributeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, description } = parsed.data;

  const existing = await prisma.attribute.findUnique({ where: { name } });
  if (existing) return jsonError(409, "Attribute already exists");

  await prisma.attribute.create({ data: { name, description } });
  return NextResponse.json({ success: true });
});
