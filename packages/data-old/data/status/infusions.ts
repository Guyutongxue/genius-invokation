import { DamageType, createStatus } from "@gi-tcg";

const infusion = (id: number, type: DamageType, additional = 0) => {
  return createStatus(id).on("earlyBeforeDealDamage", (c) => {
    if (c.damageType === DamageType.Physical || c.damageType === type) {
      c.changeDamageType(type);
      if (additional) {
        c.addDamage(additional);
      }
    }
  });
};

export const ElectroInfusion = infusion(114032, DamageType.Electro)
  .withUsage(2)
  .on("enter", (c) => {
    c.findCombatStatus(ElectroInfusion01)?.dispose();
    return false;
  })
  .build();
export const ElectroInfusion01 = infusion(114034, DamageType.Electro, 1)
  .withUsage(3)
  .on("enter", (c) => {
    c.findCombatStatus(ElectroInfusion)?.dispose();
    return false;
  })
  .build();

export const CryoElementalInfusion = infusion(111052, DamageType.Cryo)
  .withDuration(1)
  .on("enter", (c) => {
    c.findCombatStatus(CryoElementalInfusion01)?.dispose();
    return false;
  })
  .build()
export const CryoElementalInfusion01 = infusion(111053, DamageType.Cryo, 1)
  .withDuration(1)
  .on("enter", (c) => {
    c.findCombatStatus(CryoElementalInfusion)?.dispose();
    return false;
  })
  .build()
