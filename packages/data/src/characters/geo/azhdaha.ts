import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 126021
 * @name 磐岩百相·元素汲取
 * @description
 * 角色可以汲取冰/水/火/雷元素的力量，然后根据所汲取的元素类型，获得技能霜刺破袭/洪流重斥/炽焰重斥/霆雷破袭。（角色同时只能汲取一种元素，此状态会记录角色已汲取过的元素类型数量）
 * 角色汲取了一种和当前不同的元素后：生成1个所汲取元素类型的元素骰。
 */
const StoneFacetsElementalAbsorption = status(126021)
  // TODO
  .done();

/**
 * @id 126022
 * @name 磐岩百相·元素凝晶
 * @description
 * 角色受到冰/水/火/雷元素伤害后：如果角色当前未汲取该元素的力量，则移除此状态，然后角色汲取对应元素的力量。
 */
const StoneFacetsElementalCrystallization = status(126022)
  // TODO
  .done();

/**
 * @id 126023
 * @name 磐岩百相·元素征召
 * @description
 * 结束阶段：角色根据当前已汲取的元素类型，汲取一种不同元素的力量。
 * 如果角色未汲取元素或当前已汲取雷元素，则汲取水元素的力量。
 * 如果角色当前已汲取水元素，则汲取冰元素的力量。
 * 如果角色当前已汲取冰元素，则汲取火元素的力量。
 * 如果角色当前已汲取火元素，则汲取雷元素的力量。
 */
const StoneFacetsElementalSummoning = status(126023)
  // TODO
  .done();

/**
 * @id 26021
 * @name 碎岩冲撞
 * @description
 * 造成2点物理伤害。
 */
const SunderingCharge = skill(26021)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  // TODO
  .done();

/**
 * @id 26022
 * @name 磅礴之气
 * @description
 * 造成3点岩元素伤害，如果发生了结晶反应，则角色汲取对应元素的力量。
 * 如果本技能中角色未汲取元素的力量，则附属磐岩百相·元素凝晶。
 */
const AuraOfMajesty = skill(26022)
  .type("elemental")
  .costGeo(3)
  // TODO
  .done();

/**
 * @id 26024
 * @name 山崩毁阵
 * @description
 * 造成4点岩元素伤害，每汲取过一种元素此伤害+1。
 */
const DecimatingRockfall = skill(26024)
  .type("burst")
  .costGeo(3)
  .costEnergy(2)
  // TODO
  .done();

/**
 * @id 26025
 * @name 磐岩百相
 * @description
 * 【被动】战斗开始时，初始附属磐岩百相·元素汲取。
 */
const StoneFacets = skill(26025)
  .type("passive")
  // TODO
  .done();

/**
 * @id 2602
 * @name 若陀龙王
 * @description
 * 枷锁的隐隐震响与龙祖低沉的怒吼，同记忆一般在山峦间回荡。
 */
const Azhdaha = character(2602)
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 226022
 * @name 晦朔千引
 * @description
 * 战斗行动：我方出战角色为若陀龙王时，对该角色打出。使若陀龙王附属磐岩百相·元素凝晶，然后生成每种我方角色所具有的元素类型的元素骰各1个。
 * （牌组中包含若陀龙王，才能加入牌组）
 */
const LunarCyclesUnending = card(226022)
  .costSame(2)
  .tags("action")
  .eventTalent(Azhdaha)
  // TODO
  .done();

/**
 * @id 66013
 * @name 霜刺破袭
 * @description
 * 造成3点冰元素伤害，此角色附属磐岩百相·元素凝晶。
 */
const FrostspikeWave = skill(66013)
  .type("elemental")
  .costCryo(3)
  // TODO
  .done();

/**
 * @id 6601
 * @name 若陀龙王
 * @description
 * 
 */
const AzhdahaCryo = character(6601)
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, FrostspikeWave, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66023
 * @name 洪流重斥
 * @description
 * 造成3点水元素伤害，此角色附属磐岩百相·元素凝晶。
 */
const TorrentialRebuke = skill(66023)
  .type("elemental")
  .costHydro(3)
  // TODO
  .done();

/**
 * @id 6602
 * @name 若陀龙王
 * @description
 * 
 */
const AzhdahaHydro = character(6602)
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, TorrentialRebuke, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66033
 * @name 炽焰重斥
 * @description
 * 造成3点火元素伤害，此角色附属磐岩百相·元素凝晶。
 */
const BlazingRebuke = skill(66033)
  .type("elemental")
  .costPyro(3)
  // TODO
  .done();

/**
 * @id 6603
 * @name 若陀龙王
 * @description
 * 
 */
const AzhdahaPyro = character(6603)
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, BlazingRebuke, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66043
 * @name 霆雷破袭
 * @description
 * 造成3点雷元素伤害，此角色附属磐岩百相·元素凝晶。
 */
const ThunderstormWave = skill(66043)
  .type("elemental")
  .costElectro(3)
  // TODO
  .done();

/**
 * @id 6604
 * @name 若陀龙王
 * @description
 * 
 */
const AzhdahaElectro = character(6604)
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, ThunderstormWave, DecimatingRockfall, StoneFacets)
  .done();
