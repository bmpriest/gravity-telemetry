/**
 * POST /api/admin/ships — create a new ship row. Modules are added via the
 * dedicated /api/admin/ships/:id/modules endpoint so this stays focused on the
 * ship-level fields. Admin only.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  asInt, asIntOrNull, parseFighterSize, parseManufacturerId, parseRow, parseShipType,
} from "@/lib/adminPayloads";

interface Body {
  name: string;
  title: string;
  img?: string;
  type: string;
  variant: string;
  variantName: string;
  hasVariants: boolean;
  manufacturerId: number;
  row: string;
  commandPoints: number;
  serviceLimit: number;
  fighterType?: string | null;
  fightersPerSquadron?: number | null;
  dualPurpose?: boolean;
  smallFighterCapacity?: number | null;
  mediumFighterCapacity?: number | null;
  largeFighterCapacity?: number | null;
  corvetteCapacity?: number | null;
  onlyCarriesDualPurpose?: boolean;
  isFragmentUnlocked?: boolean;
  fragments?: { fragmentId: number; quantityRequired: number }[];
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const body = (await req.json()) as Body;

    if (!body.name || !body.variant) throw new Error("name and variant are required.");
    // Confirm the manufacturer FK exists before we attempt the insert so the
    // user gets a clean 4xx instead of a Prisma constraint violation.
    const manufacturerId = parseManufacturerId(body.manufacturerId);
    const manufacturerExists = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
    if (!manufacturerExists) throw new Error(`Manufacturer ${manufacturerId} does not exist.`);

    const duplicate = await prisma.ship.findUnique({
      where: { name_variant: { name: body.name, variant: body.variant } },
    });
    if (duplicate) throw new Error(`A ship with name="${body.name}" variant="${body.variant}" already exists.`);

    const created = await prisma.ship.create({
      data: {
        name: body.name,
        title: body.title,
        // img is optional — the shipMapper layer falls back to the (name, "A")
        // sibling or to /ships/classes/{type}.svg when this is empty.
        img: body.img ?? "",
        type: parseShipType(body.type),
        variant: body.variant,
        variantName: body.variantName,
        hasVariants: !!body.hasVariants,
        manufacturerId,
        row: parseRow(body.row),
        commandPoints: asInt(body.commandPoints, "commandPoints"),
        serviceLimit: asInt(body.serviceLimit, "serviceLimit"),
        fighterType: parseFighterSize(body.fighterType),
        fightersPerSquadron: asIntOrNull(body.fightersPerSquadron),
        dualPurpose: !!body.dualPurpose,
        smallFighterCapacity: asIntOrNull(body.smallFighterCapacity),
        mediumFighterCapacity: asIntOrNull(body.mediumFighterCapacity),
        largeFighterCapacity: asIntOrNull(body.largeFighterCapacity),
        corvetteCapacity: asIntOrNull(body.corvetteCapacity),
        onlyCarriesDualPurpose: !!body.onlyCarriesDualPurpose,
        isFragmentUnlocked: !!body.isFragmentUnlocked,
        fragments: {
          create: body.fragments?.map((f) => ({
            fragmentId: asInt(f.fragmentId, "fragmentId"),
            quantityRequired: asInt(f.quantityRequired, "quantityRequired"),
          })) ?? [],
        },
      },
    });

    return { id: created.id };
  });
}
