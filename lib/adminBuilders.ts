/**
 * Pure helpers that translate validated admin form input into Prisma create/update
 * data shapes. Kept separate from route handlers so they can be unit-tested and
 * shared between create + update endpoints.
 */
import type { ModuleInput, SubsystemInput } from "@/lib/adminSchemas";

export function buildModuleCreateData(shipId: number, data: ModuleInput) {
  return {
    shipId,
    system: data.system as never,
    kind: data.kind as never,
    isDefault: data.isDefault,
    img: data.img,
    name: data.kind === "unknown" ? null : data.name ?? null,
    hp: data.kind === "unknown" ? null : data.hp ?? null,
    antishipDamage: data.kind === "weapon" ? data.antishipDamage ?? null : null,
    antiairDamage: data.kind === "weapon" ? data.antiairDamage ?? null : null,
    siegeDamage: data.kind === "weapon" ? data.siegeDamage ?? null : null,
    cruise: data.kind === "propulsion" ? data.cruise ?? null : null,
    warp: data.kind === "propulsion" ? data.warp ?? null : null,
    armor: data.kind === "misc" ? data.armor ?? null : null,
    extraHp: data.kind === "misc" ? data.extraHp ?? null : null,
    energyShield: data.kind === "misc" ? data.energyShield ?? null : null,
    hpRecovery: data.kind === "misc" ? data.hpRecovery ?? null : null,
    storage: data.kind === "misc" ? data.storage ?? null : null,
  };
}

export function buildSubsystemCreateData(moduleId: number, data: SubsystemInput) {
  return {
    moduleId,
    kind: data.kind as never,
    count: data.count,
    title: data.title,
    name: data.name,
    sortOrder: data.sortOrder,
    damageType: (data.damageType ?? null) as never,
    weaponTarget: (data.weaponTarget ?? null) as never,
    lockonEfficiency: data.lockonEfficiency ?? null,
    alpha: data.alpha ?? null,
    hangerSlot: data.hangerSlot ?? null,
    capacity: data.capacity ?? null,
    repair: data.repair ?? null,
    statsKind: data.statsKind as never,
    attacksPerRoundA: data.attacksPerRoundA ?? null,
    attacksPerRoundB: data.attacksPerRoundB ?? null,
    duration: data.duration ?? null,
    damageFrequency: data.damageFrequency ?? null,
    cooldown: data.cooldown ?? null,
    lockOnTime: data.lockOnTime ?? null,
    operationCountA: data.operationCountA ?? null,
    operationCountB: data.operationCountB ?? null,
    antishipPosition: data.antishipPosition ?? null,
    antishipDamage: data.antishipDamage ?? null,
    antiairPosition: data.antiairPosition ?? null,
    antiairDamage: data.antiairDamage ?? null,
    siegePosition: data.siegePosition ?? null,
    siegeDamage: data.siegeDamage ?? null,
  };
}
