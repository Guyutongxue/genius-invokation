import { character, skill, summon, card, DamageType, canSwitchDeductCost1, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 112011
 * @name 歌声之环
 * @description
 * 结束阶段：治疗所有我方角色1点，然后对我方出战角色附着水元素。
 * 可用次数：2
 */
const MelodyLoop = summon(112011)
  .endPhaseDamage(DamageType.Heal, 1, "all my characters")
  .usage(2)
  .apply(DamageType.Hydro, "active")
  .on("beforeUseDice", (c) =>
    c.$("my characters has equipment with definition id 212011") && // 装备有天赋的芭芭拉在场时
    canSwitchDeductCost1(c)
  )
  .usagePerRound(1)
  .deductCost(DiceType.Omni, 1)
  .done();

/**
 * @id 12011
 * @name 水之浅唱
 * @description
 * 造成1点水元素伤害。
 */
const WhisperOfWater = skill(12011)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12012
 * @name 演唱，开始♪
 * @description
 * 造成1点水元素伤害，召唤歌声之环。
 */
const LetTheShowBegin = skill(12012)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 1)
  .summon(MelodyLoop)
  .done();

/**
 * @id 12013
 * @name 闪耀奇迹♪
 * @description
 * 治疗所有我方角色4点。
 */
const ShiningMiracle = skill(12013)
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .heal(4, "all my characters")
  .done();

/**
 * @id 1201
 * @name 芭芭拉
 * @description
 * 无论何时都能治愈人心。
 */
const Barbara = character(1201)
  .tags("hydro", "catalyst", "mondstadt")
  .health(10)
  .energy(3)
  .skills(WhisperOfWater, LetTheShowBegin, ShiningMiracle)
  .done();

/**
 * @id 212011
 * @name 光辉的季节
 * @description
 * 战斗行动：我方出战角色为芭芭拉时，装备此牌。
 * 芭芭拉装备此牌后，立刻使用一次演唱，开始♪。
 * 装备有此牌的芭芭拉在场时，歌声之环会使我方执行「切换角色」行动时少花费1个元素骰。（每回合1次）
 * （牌组中包含芭芭拉，才能加入牌组）
 */
const GloriousSeason = card(212011)
  .costHydro(3)
  .talent(Barbara)
  .on("enter")
  .useSkill(LetTheShowBegin)
  .done();
