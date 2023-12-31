import { character, skill, summon, combatStatus, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 111093
 * @name 饰梦天球
 * @description
 * 结束阶段：造成1点冰元素伤害。如果飞星在场，则使其累积1枚「晚星」。
 * 可用次数：2
 */
const CelestialDreamsphere = summon(111093)
  // TODO
  .done();

/**
 * @id 111091
 * @name 安眠帷幕护盾
 * @description
 * 提供2点护盾，保护我方出战角色。
 */
const CurtainOfSlumberShield = combatStatus(111091)
  // TODO
  .done();

/**
 * @id 111092
 * @name 飞星
 * @description
 * 我方角色使用技能后：累积1枚「晚星」。如果「晚星」已有至少4枚，则消耗4枚「晚星」，造成1点冰元素伤害。（生成此出战状态的技能，也会触发此效果）
 * 重复生成此出战状态时：累积2枚「晚星」。
 */
const ShootingStar = combatStatus(111092)
  // TODO
  .done();

/**
 * @id 11091
 * @name 熠辉轨度剑
 * @description
 * 造成2点物理伤害。
 */
const SwordOfTheRadiantPath = skill(11091)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  // TODO
  .done();

/**
 * @id 11092
 * @name 垂裳端凝之夜
 * @description
 * 生成安眠帷幕护盾和飞星。
 */
const NightsOfFormalFocus = skill(11092)
  .type("elemental")
  .costCryo(3)
  // TODO
  .done();

/**
 * @id 11093
 * @name 星流摇床之梦
 * @description
 * 造成3点冰元素伤害，召唤饰梦天球。
 */
const DreamOfTheStarstreamShaker = skill(11093)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  // TODO
  .done();

/**
 * @id 1109
 * @name 莱依拉
 * @description
 * 夜沉星移，月笼梦行。
 */
const Layla = character(1109)
  .tags("cryo", "sword", "sumeru")
  .health(10)
  .energy(2)
  .skills(SwordOfTheRadiantPath, NightsOfFormalFocus, DreamOfTheStarstreamShaker)
  .done();

/**
 * @id 211091
 * @name 归芒携信
 * @description
 * 战斗行动：我方出战角色为莱依拉时，装备此牌。
 * 莱依拉装备此牌后，立刻使用一次垂裳端凝之夜。
 * 装备有此牌的莱依拉在场时，每当飞星造成伤害，就抓1张牌。
 * （牌组中包含莱依拉，才能加入牌组）
 */
const LightsRemit = card(211091)
  .costCryo(3)
  .talent(Layla)
  // TODO
  .done();
