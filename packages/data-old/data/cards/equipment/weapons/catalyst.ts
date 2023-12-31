import { createCard } from '@gi-tcg';

/**
 * **千夜浮梦**
 * 角色造成的伤害+1。
 * 我方角色引发元素反应时：造成的伤害+1。（每回合最多触发2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
const AThousandFloatingDreams = createCard(311104, ["character"])
  .setType("equipment")
  .addTags("weaponCatalyst")
  .costSame(3)
  .buildToEquipment()
  .withUsagePerRound(2)
  .on("beforeSkillDamage", (c) => (c.addDamage(1), false))
  .on("beforeDealDamage", (c) => !!c.reaction, (c) => c.addDamage(1))
  .build();

/**
 * **魔导绪论**
 * 角色造成的伤害+1。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
const MagicGuide = createCard(311101, ["character"])
  .setType("equipment")
  .addTags("weaponCatalyst")
  .costSame(2)
  .buildToEquipment()
  .on("beforeSkillDamage", c => c.addDamage(1))
  .build();

/**
 * **祭礼残章**
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
const SacrificialFragments = createCard(311102, ["character"])
  .setType("equipment")
  .addTags("weaponCatalyst")
  .costSame(3)
  .buildToEquipment()
  .withUsagePerRound(1)
  .on("beforeSkillDamage", (c) => (c.addDamage(1), false))
  .on("useSkill", 
    (c) => c.info.type === "elemental", 
    (c) => c.generateDice(c.character.elementType()))
  .build();

/**
 * **天空之卷**
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
const SkywardAtlas = createCard(311103, ["character"])
  .setType("equipment")
  .addTags("weaponCatalyst")
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
 * **盈满之实**
 * 角色造成的伤害+1。
 * 入场时：抓2张牌。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
const FruitOfFulfillment = createCard(-37, ["character"])
  .setType("equipment")
  .addTags("weaponCatalyst")
  .costVoid(3)
  .buildToEquipment()
  .on("enter", (c) => c.drawCards(2))
  .on("beforeSkillDamage", (c) => c.addDamage(1))
  .build();
