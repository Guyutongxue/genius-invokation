import { createCard, createStatus } from '@gi-tcg';

/**
 * **薙草之稻光**
 * 角色造成的伤害+1。
 * 每回合自动触发1次：如果所附属角色没有充能，就使其获得1点充能。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const EngulfingLightning = createCard(311405, ["character"])
  .setType("equipment")
  .addTags("weaponPole")
  .costSame(3)
  .buildToEquipment()
  .on("beforeSkillDamage", (c) => c.addDamage(1))
  .on("enter", (c) => {
    const m = c.this.master;
    if (m.energy === 0) {
      m.gainEnergy(1);
    }
  })
  .on("actionPhase", (c) => {
    const m = c.this.master;
    if (m.energy === 0) {
      m.gainEnergy(1);
    }
  })
  .build();

/**
 * **千岩之护**
 * 根据「璃月」角色的数量提供护盾，保护所附属的角色。
 */
const LithicGuard = createStatus(301101)
  .shield(0)
  .build();

/**
 * **千岩长枪**
 * 角色造成的伤害+1。
 * 入场时：我方队伍中每有一名「璃月」角色，此牌就为附属的角色提供1点护盾。（最多3点）
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const LithicSpear = createCard(311402, ["character"])
  .setType("equipment")
  .addTags("weaponPole")
  .costSame(3)
  .buildToEquipment()
  .on("enter", (c) => {
    const shield = c
      .queryCharacterAll(":tag*(liyue)")
      .length;
    const status = c.this.master.createStatus(LithicGuard);
    status.setValue(shield);
  })
  .on("beforeSkillDamage", (c) => c.addDamage(1))
  .build();

/**
 * **天空之脊**
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const SkywardSpine = createCard(311403, ["character"])
  .setType("equipment")
  .addTags("weaponPole")
  .costSame(3)
  .buildToEquipment()
  .on("beforeSkillDamage", (c) => {
    if (c.sourceSkill.info.type === "normal") {
      c.addDamage(2);
    } else {
      c.addDamage(1);
    }
  })
  .build();

/**
 * **贯虹之槊**
 * 角色造成的伤害+1。
 * 角色如果在护盾角色状态或护盾出战状态的保护下，则造成的伤害额外+1。
 * 角色使用「元素战技」后：如果我方存在提供「护盾」的出战状态，则为一个此类出战状态补充1点「护盾」。（每回合1次）
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const VortexVanquisher = createCard(311404, ["character"])
  .setType("equipment")
  .addTags("weaponPole")
  .costSame(3)
  .buildToEquipment()
  .withUsagePerRound(1)
  .on("beforeSkillDamage", (c) => {
    if (c.this.master?.findShield()) {
      c.addDamage(2);
    } else {
      c.addDamage(1);
    }
    return false;
  })
  .on("useSkill", (c) => {
    const status = c.findCombatShield();
    if (status) {
      status.setValue(status.value + 1);
    }
  })
  .build();

/**
 * **白缨枪**
 * 角色造成的伤害+1。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const WhiteTassel = createCard(311401, ["character"])
  .setType("equipment")
  .addTags("weaponPole")
  .costSame(2)
  .buildToEquipment()
  .on("beforeSkillDamage", (c) => c.addDamage(1))
  .build();
