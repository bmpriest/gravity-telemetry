import { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/admin/ships/images — List all ship images in /public/ships.
 * POST /api/admin/ships/images — Upload a new ship image to /public/ships.
 */

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const dir = path.join(process.cwd(), "public", "ships");
    const files = await fs.readdir(dir);
    const images = files.filter((f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".webp"));
    return { data: images.map((img) => `/ships/${img}`) };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) throw new Error("No file uploaded.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase().replace(/\s+/g, "_");
    const filePath = path.join(process.cwd(), "public", "ships", fileName);

    await fs.writeFile(filePath, buffer);

    return { data: { path: `/ships/${fileName}` } };
  });
}
