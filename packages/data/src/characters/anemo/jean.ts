import { character, skill, summon, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 115021
 * @name 蒲公英领域
 * @description
 * 结束阶段：造成1点风元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
const DandelionField = summon(115021)
  .endPhaseDamage(DamageType.Anemo, 1)
  .usage(2)
  .heal(1, "active")
  .on("beforeDealDamage", (c) => 
    c.$("my characters has equipment with definition id 215021") && // 装备有天赋的琴在场时
    c.damageInfo.type === DamageType.Anemo
  )
  .increaseDamage(1)
  .done();

/**
 * @id 15021
 * @name 西风剑术
 * @description
 * 造成2点物理伤害。
 */
const FavoniusBladework = skill(15021)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 15022
 * @name 风压剑
 * @description
 * 造成3点风元素伤害，使对方强制切换到下一个角色。
 */
const GaleBlade = skill(15022)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 3)
  .switchActive("opp next")
  .done();

/**
 * @id 15023
 * @name 蒲公英之风
 * @description
 * 治疗所有我方角色2点，召唤蒲公英领域。
 */
const DandelionBreeze = skill(15023)
  .type("burst")
  .costAnemo(4)
  .costEnergy(2)
  .heal(2, "all my characters")
  .summon(DandelionField)
  .done();

/**
 * @id 1502
 * @name 琴
 * @description
 * 在夺得最终的胜利之前，她总是认为自己做得还不够好。
 */
const Jean = character(1502)
  .tags("anemo", "sword", "mondstadt")
  .health(10)
  .energy(3)
  .skills(FavoniusBladework, GaleBlade, DandelionBreeze)
  .done();

/**
 * @id 215021
 * @name 蒲公英的国土
 * @description
 * 战斗行动：我方出战角色为琴时，装备此牌。
 * 琴装备此牌后，立刻使用一次蒲公英之风。
 * 装备有此牌的琴在场时，蒲公英领域会使我方造成的风元素伤害+1。
 * （牌组中包含琴，才能加入牌组）
 */
const LandsOfDandelion = card(215021)
  .costAnemo(4)
  .costEnergy(2)
  .talent(Jean)
  .on("enter")
  .useSkill(DandelionBreeze)
  .done();
