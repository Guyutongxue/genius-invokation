import { Reaction as R, Aura as A, DamageType as D } from "@gi-tcg/typings";
import {
  DamageInfo,
  DamageModifierImpl,
  SkillDescription,
} from "../base/skill";
import { SkillBuilder, enableShortcut } from "./skill";
import { ExtendedSkillContext, SkillContext } from "./context";
import { CombatStatusHandle, StatusHandle, SummonHandle } from "./type";

export type NontrivialDamageType = Exclude<D, D.Physical | D.Piercing | D.Heal>;

export type ReactionMap = Record<
  A,
  Record<NontrivialDamageType, [A, R | null]>
>;

export const REACTION_MAP: ReactionMap = {
  [A.None]: {
    [D.Cryo]: [A.Cryo, null],
    [D.Hydro]: [A.Hydro, null],
    [D.Pyro]: [A.Pyro, null],
    [D.Electro]: [A.Electro, null],
    [D.Anemo]: [A.None, null],
    [D.Geo]: [A.None, null],
    [D.Dendro]: [A.Dendro, null],
  },
  [A.Cryo]: {
    [D.Cryo]: [A.Cryo, null],
    [D.Hydro]: [A.None, R.Frozen],
    [D.Pyro]: [A.None, R.Melt],
    [D.Electro]: [A.None, R.Superconduct],
    [D.Anemo]: [A.None, R.SwirlCryo],
    [D.Geo]: [A.None, R.CrystallizeCryo],
    [D.Dendro]: [A.CryoDendro, null],
  },
  [A.Hydro]: {
    [D.Cryo]: [A.None, R.Frozen],
    [D.Hydro]: [A.Hydro, null],
    [D.Pyro]: [A.None, R.Vaporize],
    [D.Electro]: [A.None, R.ElectroCharged],
    [D.Anemo]: [A.None, R.SwirlHydro],
    [D.Geo]: [A.None, R.CrystallizeHydro],
    [D.Dendro]: [A.None, R.Bloom],
  },
  [A.Pyro]: {
    [D.Cryo]: [A.None, R.Melt],
    [D.Hydro]: [A.None, R.Vaporize],
    [D.Pyro]: [A.Pyro, null],
    [D.Electro]: [A.None, R.Overloaded],
    [D.Anemo]: [A.None, R.SwirlPyro],
    [D.Geo]: [A.None, R.CrystallizePyro],
    [D.Dendro]: [A.None, R.Burning],
  },
  [A.Electro]: {
    [D.Cryo]: [A.None, R.Superconduct],
    [D.Hydro]: [A.None, R.ElectroCharged],
    [D.Pyro]: [A.None, R.Overloaded],
    [D.Electro]: [A.Electro, null],
    [D.Anemo]: [A.None, R.SwirlElectro],
    [D.Geo]: [A.None, R.CrystallizeElectro],
    [D.Dendro]: [A.None, R.Quicken],
  },
  [A.Dendro]: {
    [D.Cryo]: [A.CryoDendro, null],
    [D.Hydro]: [A.None, R.Bloom],
    [D.Pyro]: [A.None, R.Burning],
    [D.Electro]: [A.None, R.Quicken],
    [D.Anemo]: [A.Dendro, null],
    [D.Geo]: [A.Dendro, null],
    [D.Dendro]: [A.Dendro, null],
  },
  [A.CryoDendro]: {
    [D.Cryo]: [A.CryoDendro, null],
    [D.Hydro]: [A.Dendro, R.Frozen],
    [D.Pyro]: [A.Dendro, R.Melt],
    [D.Electro]: [A.Dendro, R.Superconduct],
    [D.Anemo]: [A.Dendro, R.SwirlCryo],
    [D.Geo]: [A.Dendro, R.CrystallizeCryo],
    [D.Dendro]: [A.CryoDendro, null],
  },
};

const REACTION_RELATIVES: Record<R, readonly [D, D]> = {
  [R.Melt]: [D.Pyro, D.Cryo],
  [R.Vaporize]: [D.Pyro, D.Hydro],
  [R.Overloaded]: [D.Pyro, D.Electro],
  [R.Superconduct]: [D.Cryo, D.Electro],
  [R.ElectroCharged]: [D.Hydro, D.Electro],
  [R.Frozen]: [D.Cryo, D.Hydro],
  [R.SwirlCryo]: [D.Cryo, D.Anemo],
  [R.SwirlHydro]: [D.Hydro, D.Anemo],
  [R.SwirlPyro]: [D.Pyro, D.Anemo],
  [R.SwirlElectro]: [D.Electro, D.Anemo],
  [R.CrystallizeCryo]: [D.Cryo, D.Geo],
  [R.CrystallizeHydro]: [D.Hydro, D.Geo],
  [R.CrystallizePyro]: [D.Pyro, D.Geo],
  [R.CrystallizeElectro]: [D.Electro, D.Geo],
  [R.Burning]: [D.Pyro, D.Dendro],
  [R.Bloom]: [D.Dendro, D.Hydro],
  [R.Quicken]: [D.Dendro, D.Electro],
};

const Frozen = 106 as StatusHandle;
const Crystallize = 111 as CombatStatusHandle;
const BurningFlame = 115 as SummonHandle;
const DendroCore = 116 as CombatStatusHandle;
const CatalyzingField = 117 as CombatStatusHandle;

type DamageModifierR = DamageModifierImpl<OptionalDamageInfo>;

export interface OptionalDamageInfo extends DamageInfo {
  isDamage: boolean;
}

type ReactionDescription = SkillDescription<DamageModifierR>;
export const REACTION_DESCRIPTION: Record<R, ReactionDescription> = {} as any;

class ReactionBuilder extends SkillBuilder<DamageModifierR, any> {
  constructor(private reaction: R) {
    super(reaction);
  }

  protected override getExtension(
    skillCtx: SkillContext<false, {}, any>,
    arg?: any,
  ): DamageModifierR {
    return arg;
  }

  done() {
    REACTION_DESCRIPTION[this.reaction] = (st, id, d) => {
      return this.getAction(d)(st, id);
    };
  }
}

function reaction(reaction: R) {
  return enableShortcut(new ReactionBuilder(reaction));
}

type ReactionAction = (
  c: ExtendedSkillContext<false, DamageModifierR, any>,
) => void;

const pierceToOther: ReactionAction = (c) => {
  if (c.damageInfo.isDamage) {
    c.increaseDamage(1);
    c.damage(D.Piercing, 1, "opp character and not @damage.target");
  }
};

const crystallize: ReactionAction = (c) => {
  c.increaseDamage(1);
  c.combatStatus(Crystallize);
};

const swirl = (srcElement: D): ReactionAction => {
  return (c) => {
    if (c.damageInfo.isDamage) {
      c.damage(srcElement, 1, "opp character and not @damage.target");
    }
  };
};

reaction(R.Melt)
  .if((c) => c.damageInfo.isDamage)
  .increaseDamage(2)
  .done();

reaction(R.Vaporize)
  .if((c) => c.damageInfo.isDamage)
  .increaseDamage(2)
  .done();

reaction(R.Overloaded)
  .if((c) => c.$$(`@damage.target and active`).length > 0)
  .switchActive("opp next")
  .done();

reaction(R.Superconduct)
  .do(pierceToOther) //
  .done();

reaction(R.ElectroCharged)
  .do(pierceToOther) //
  .done();

reaction(R.Frozen)
  .if((c) => c.damageInfo)
  .increaseDamage(1)
  .characterStatus(Frozen, "@damage.target")
  .done();

reaction(R.SwirlCryo).do(swirl(D.Cryo)).done();

reaction(R.SwirlHydro).do(swirl(D.Hydro)).done();

reaction(R.SwirlPyro).do(swirl(D.Pyro)).done();

reaction(R.SwirlElectro).do(swirl(D.Electro)).done();

reaction(R.CrystallizeCryo).do(crystallize).done();

reaction(R.CrystallizeHydro).do(crystallize).done();

reaction(R.CrystallizePyro).do(crystallize).done();

reaction(R.CrystallizeElectro).do(crystallize).done();

reaction(R.Burning)
  .if((c) => c.damageInfo.isDamage)
  .increaseDamage(1)
  .summon(BurningFlame)
  .done();

reaction(R.Bloom)
  .if((c) => c.damageInfo.isDamage)
  .increaseDamage(1)
  // Nilou
  .if((c) => c.$$(`combat status with definition id 112081`).length)
  .combatStatus(DendroCore);

reaction(R.Quicken)
  .if((c) => c.damageInfo)
  .combatStatus(CatalyzingField);

// reaction utility functions

export function getReaction(damageInfo: DamageInfo): R | null {
  if (
    damageInfo.type === D.Heal ||
    damageInfo.type === D.Physical ||
    damageInfo.type === D.Piercing
  ) {
    return null;
  }
  const [, reactionType] =
    REACTION_MAP[damageInfo.target.variables.aura][damageInfo.type];
  return reactionType;
}

export function isReaction(damageInfo: DamageInfo, reaction: R): boolean {
  return getReaction(damageInfo) === reaction;
}

export function isReactionRelatedTo(
  damageInfo: DamageInfo,
  target: D,
): boolean {
  const reaction = getReaction(damageInfo);
  if (reaction === null) return false;
  return REACTION_RELATIVES[reaction].includes(target);
}

export function isReactionSwirl(
  damageInfo: DamageInfo,
): D.Cryo | D.Electro | D.Hydro | D.Pyro | null {
  switch (getReaction(damageInfo)) {
    case R.SwirlCryo:
      return D.Cryo;
    case R.SwirlElectro:
      return D.Electro;
    case R.SwirlHydro:
      return D.Hydro;
    case R.SwirlPyro:
      return D.Pyro;
    default:
      return null;
  }
}
