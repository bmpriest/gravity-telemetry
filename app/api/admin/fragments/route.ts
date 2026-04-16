import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const fragments = await prisma.blueprintFragment.findMany({
      orderBy: { name: "asc" },
    });
    return { data: fragments };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { name } = await req.json();
    if (!name) throw new Error("Name is required");

    const created = await prisma.blueprintFragment.create({
      data: { name },
    });
    return created;
  });
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { id, name } = await req.json();
    if (!id || !name) throw new Error("ID and name are required");

    const updated = await prisma.blueprintFragment.update({
      where: { id: Number(id) },
      data: { name },
    });
    return updated;
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID is required");

    await prisma.blueprintFragment.delete({
      where: { id: Number(id) },
    });
    return { success: true };
  });
}
