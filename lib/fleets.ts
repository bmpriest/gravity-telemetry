import "server-only";
import { FleetRow as PrismaFleetRow, type Prisma } from "@prisma/client";

const ROW_KEYS = ["front", "middle", "back", "reinforcements"] as const;
type RowKey = (typeof ROW_KEYS)[number];

export const FLEET_ROW_KEYS: ReadonlyArray<RowKey> = ROW_KEYS;

export const wireRowToPrisma: Record<RowKey, PrismaFleetRow> = {
  front: PrismaFleetRow.front,
  middle: PrismaFleetRow.middle,
  back: PrismaFleetRow.back,
  reinforcements: PrismaFleetRow.reinforcements,
};

export type WireInstance = {
  id: string;
  shipId: number;
  variant: string;
};

export type WireFleet = {
  id: string;
  name: string;
  maxCommandPoints: number;
  rows: Record<RowKey, WireInstance[]>;
  carrierLoads: Record<string, WireInstance[]>;
};

export type FleetWithInstances = Prisma.FleetGetPayload<{
  include: { instances: { include: { ship: { select: { variant: true } } } } };
}>;

export function fleetToWire(fleet: FleetWithInstances): WireFleet {
  const rows: Record<RowKey, WireInstance[]> = {
    front: [],
    middle: [],
    back: [],
    reinforcements: [],
  };
  const carrierLoads: Record<string, WireInstance[]> = {};

  // Sort instances by position so front-end ordering is stable.
  const sorted = [...fleet.instances].sort((a, b) => a.position - b.position);

  for (const inst of sorted) {
    const wire: WireInstance = {
      id: inst.id,
      shipId: inst.shipId,
      variant: inst.ship.variant,
    };
    if (inst.fleetRow === PrismaFleetRow.carried) {
      const parent = inst.carrierInstanceId;
      if (parent) {
        (carrierLoads[parent] ??= []).push(wire);
      }
    } else {
      const key = inst.fleetRow as RowKey;
      rows[key].push(wire);
    }
  }

  return {
    id: fleet.id,
    name: fleet.name,
    maxCommandPoints: fleet.maxCommandPoints,
    rows,
    carrierLoads,
  };
}
