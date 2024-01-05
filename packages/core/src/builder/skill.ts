import { DamageType, DiceType } from "@gi-tcg/typings";
import { registerSkill } from "./registry";
import {
  CommonSkillType,
  SkillDescription,
  SkillType,
  EventNames,
  EventExt,
  SkillInfo,
  TriggeredSkillDefinition,
  TriggeredSkillFilter,
} from "../base/skill";
import { CharacterState, EntityState, GameState } from "../base/state";
import {
  SkillContext,
  ExtendedSkillContext,
  StrictlyTypedSkillContext,
} from "./context";
import {
  AppliableDamageType,
  ExEntityType,
  HandleT,
  SkillHandle,
  SummonHandle,
} from "./type";
import { EntityArea, EntityType } from "../base/entity";
import { EntityBuilder, ExtOfEntity, VariableOptions } from "./entity";
import { getEntityArea } from "../util";

type EventArgOfExt<Ext extends object> = Ext extends { eventArg: infer T }
  ? T
  : void;

type SkillOperation<Ext extends object, CallerType extends ExEntityType> = (
  c: ExtendedSkillContext<false, Ext, CallerType>,
  e: EventArgOfExt<Ext>,
) => void;

export type SkillFilter<Ext extends object, CallerType extends ExEntityType> = (
  c: ExtendedSkillContext<true, Ext, CallerType>,
  e: EventArgOfExt<Ext>,
) => unknown;

enum ListenTo {
  Myself,
  SameArea,
  SamePlayer,
  All,
}

interface RelativeArg {
  callerId: number;
  callerArea: EntityArea;
  listenTo: ListenTo;
}

function checkRelative(
  state: GameState,
  entityIdOrWhoIntf: number | { who: 0 | 1 },
  r: RelativeArg,
): boolean {
  if (typeof entityIdOrWhoIntf === "number") {
    const entityArea = getEntityArea(state, entityIdOrWhoIntf);
    switch (r.listenTo) {
      case ListenTo.Myself:
        return r.callerId === entityIdOrWhoIntf;
      // @ts-expect-error fallthrough
      case ListenTo.SameArea:
        if (
          r.callerArea.type === "characters" &&
          entityArea.type === "characters"
        ) {
          return r.callerArea.characterId === entityArea.characterId;
        }
      case ListenTo.SamePlayer:
        return r.callerArea.who === entityArea.who;
      case ListenTo.All:
        return true;
      default:
        const _: never = r.listenTo;
        throw new Error(`Unknown listenTo: ${_}`);
    }
  } else {
    if (r.listenTo === ListenTo.All) {
      return true;
    } else {
      return r.callerArea.who === entityIdOrWhoIntf.who;
    }
  }
}

type Descriptor<E extends EventNames> = readonly [
  E,
  (
    e: ExtendedSkillContext<true, EventExt<E>, ExEntityType>,
    listen: RelativeArg,
  ) => boolean,
];

function defineDescriptor<E extends EventNames>(
  name: E,
  filter?: Descriptor<E>[1],
): Descriptor<E> {
  return [name, filter ?? ((e) => true)];
}

/**
 * 检查此技能使用是否适用于通常意义上的“使用技能后”。
 *
 * 通常意义上的使用技能后是指：
 * 1. 该技能为主动技能；且
 * 2. 该技能不是准备技能触发的。
 * 3. Note: 通过使用卡牌（天赋等）触发的技能也适用。
 */
function commonInitiativeSkillCheck(skillInfo: SkillInfo): boolean {
  if (
    skillInfo.definition.triggerOn === null &&
    skillInfo.definition.skillType !== "card"
  ) {
    // 主动技能且并非卡牌描述
    const requestBy = skillInfo.requestBy;
    if (
      requestBy &&
      requestBy.caller.definition.type !== "character" &&
      requestBy.caller.definition.tags.includes("preparing")
    ) {
      // 准备技能不触发
      return false;
    }
    return true;
  }
  return false;
}

function isDebuff(state: CharacterState | EntityState): boolean {
  return (
    state.definition.type !== "character" &&
    state.definition.tags.includes("debuff")
  );
}

/**
 * 定义数据描述中的触发事件名。
 *
 * 系统内部的事件名数量较少，
 * 提供给数据描述的事件名可解释为内部事件+筛选条件。
 * 比如 `onDamaged` 可解释为 `onDamage` 发生且伤害目标
 * 在监听范围内。
 */
const detailedEventDictionary = {
  roll: defineDescriptor("onRoll", (c, r) => {
    return checkRelative(c.state, { who: c.eventWho }, r);
  }),
  beforeUseDice: defineDescriptor("onBeforeUseDice", (c, r) => {
    return checkRelative(c.state, { who: c.eventWho }, r);
  }),
  beforeDamageType: defineDescriptor("onBeforeDamage0", (c, r) => {
    return checkRelative(c.state, c.damageInfo.source.id, r);
  }),
  beforeDealDamage: defineDescriptor("onBeforeDamage1", (c, r) => {
    return (
      c.damageInfo.type !== DamageType.Piercing &&
      checkRelative(c.state, c.damageInfo.source.id, r) &&
      !isDebuff(c.damageInfo.source)
    );
  }),
  beforeSkillDamage: defineDescriptor("onBeforeDamage1", (c, r) => {
    return (
      c.damageInfo.type !== DamageType.Piercing &&
      checkRelative(c.state, c.damageInfo.source.id, r) &&
      commonInitiativeSkillCheck(c.damageInfo.via)
    );
  }),
  beforeDamaged: defineDescriptor("onBeforeDamage1", (c, r) => {
    return (
      c.damageInfo.type !== DamageType.Piercing &&
      checkRelative(c.state, c.damageInfo.target.id, r)
    );
  }),
  beforeDefeated: defineDescriptor("onBeforeDefeated", (c, r) => {
    return checkRelative(c.state, c.target.id, r);
  }),

  battleBegin: defineDescriptor("onBattleBegin"),
  actionPhase: defineDescriptor("onActionPhase"),
  endPhase: defineDescriptor("onEndPhase"),
  beforeAction: defineDescriptor("onBeforeAction", (c, r) => {
    return checkRelative(c.eventArg.state, { who: c.eventArg.who }, r);
  }),
  action: defineDescriptor("onAction", (c, r) => {
    return checkRelative(c.eventArg.state, { who: c.eventArg.who }, r);
  }),
  playCard: defineDescriptor("onAction", (c, r) => {
    if (!checkRelative(c.eventArg.state, { who: c.eventArg.who }, r))
      return false;
    return c.eventArg.type === "playCard";
  }),
  declareEnd: defineDescriptor("onAction", (c, r) => {
    if (!checkRelative(c.eventArg.state, { who: c.eventArg.who }, r))
      return false;
    return c.eventArg.type === "declareEnd";
  }),
  skill: defineDescriptor("onSkill", (c, r) => {
    if (!checkRelative(c.eventArg.state, c.eventArg.caller.id, r)) return false;
    return commonInitiativeSkillCheck(c.eventArg);
  }),
  switchActive: defineDescriptor("onSwitchActive", (c, r) => {
    return (
      checkRelative(c.eventArg.state, c.eventArg.from.id, r) ||
      checkRelative(c.eventArg.state, c.eventArg.to.id, r)
    );
  }),
  dealDamage: defineDescriptor("onDamage", (c, r) => {
    return checkRelative(c.eventArg.state, c.eventArg.source.id, r);
  }),
  damaged: defineDescriptor("onDamage", (c, r) => {
    return checkRelative(c.eventArg.state, c.eventArg.target.id, r);
  }),
  healed: defineDescriptor("onHeal", (c, r) => {
    return checkRelative(c.eventArg.state, c.eventArg.target.id, r);
  }),
  elementalReaction: defineDescriptor("onElementalReaction", (c, r) => {
    return checkRelative(c.eventArg.state, c.eventArg.target.id, r);
  }),
  enter: defineDescriptor("onEnter", (c, r) => {
    return c.eventArg.entity.id === r.callerId;
  }),
  dispose: defineDescriptor("onDisposing", (c, r) => {
    return checkRelative(c.eventArg.state, c.eventArg.entity.id, r);
  }),
} satisfies Record<string, Descriptor<any>>;

type DetailedEventDictionary = typeof detailedEventDictionary;
export type DetailedEventNames = keyof DetailedEventDictionary;
export type DetailedEventExt<E extends DetailedEventNames> = EventExt<
  DetailedEventDictionary[E][0]
>;

export type SkillInfoGetter = () => SkillInfo;

const EXT_TYPE_HELPER: unique symbol = Symbol();
type ExtTypeHelperSymbolType = typeof EXT_TYPE_HELPER;
const CALLER_TYPE_HELPER: unique symbol = Symbol();
type CallerTypeHelperSymbolType = typeof CALLER_TYPE_HELPER;

export abstract class SkillBuilder<
  Ext extends object,
  CallerType extends ExEntityType,
> {
  [EXT_TYPE_HELPER]!: Ext;
  [CALLER_TYPE_HELPER]!: CallerType;

  protected operations: SkillOperation<Ext, CallerType>[] = [];
  constructor(protected readonly id: number) {}
  protected applyFilter = false;
  protected _filter: SkillFilter<Ext, CallerType> = () => true;

  if(filter: SkillFilter<Ext, CallerType>): this {
    this._filter = filter;
    this.applyFilter = true;
    return this;
  }

  do(op: SkillOperation<Ext, CallerType>): this {
    if (this.applyFilter) {
      this.operations.push((c, e) => {
        if (!(0, this._filter)(c as any, e)) return;
        return op(c, e);
      });
    } else {
      this.operations.push(op);
    }
    this.applyFilter = false;
    return this;
  }

  else(): this {
    const ifFilter = this._filter;
    this._filter = (c, e) => !ifFilter(c, e);
    this.applyFilter = true;
    return this;
  }

  /**
   * 生成内部技能描述函数。
   * 给定两个参数：它们接受 `SkillContext` 然后转换到对应扩展点。
   * 这些参数将传递给用户。
   * @param extGenerator 生成扩展点的函数
   * @returns 内部技能描述函数
   */
  protected getAction(arg?: any): SkillDescription<void> {
    return (state, skillInfo) => {
      const ctx = this.getContext(state, skillInfo, arg);
      for (const op of this.operations) {
        op(ctx, (ctx as any)?.eventArg);
      }
      return [ctx.state, ctx.events] as const;
    };
  }

  protected getContext(
    state: GameState,
    skillInfo: SkillInfo,
    arg?: any,
  ): ExtendedSkillContext<false, Ext, CallerType> {
    const ctx = new SkillContext<false, Ext, CallerType>(state, skillInfo);
    const ext = this.getExtension(ctx, arg);
    return extendSkillContext<false, Ext, CallerType>(ctx, ext);
  }

  /**
   * 子类需重写此方法以获得 SkillContext 的扩展点。
   * @param skillCtx
   * @returns
   */
  protected abstract getExtension(
    skillCtx: SkillContext<false, {}, CallerType>,
    arg?: any,
  ): Ext;
}

/**
 *
 * @param ctx 原 `SkillContext`
 * @param ext 扩展点
 * @returns 通过 `Proxy` 扩展后的 `SkillContext`
 */
export function extendSkillContext<
  Readonly extends boolean,
  Ext extends object,
  CallerType extends ExEntityType,
>(
  ctx: ExtendedSkillContext<Readonly, any, CallerType>,
  ext: Ext,
): ExtendedSkillContext<Readonly, Ext, CallerType> {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      if (prop in ext) {
        return Reflect.get(ext, prop, ext);
      } else {
        return Reflect.get(target, prop, receiver);
      }
    },
    set(target, prop, newValue, receiver) {
      if (prop in ext) {
        return Reflect.set(ext, prop, newValue, ext);
      } else {
        return Reflect.set(target, prop, newValue, receiver);
      }
    },
  }) as ExtendedSkillContext<Readonly, Ext, CallerType>;
}

// 找到所有返回 void 的方法
type AvailablePropImpl<
  Obj extends object,
  K extends keyof Obj,
> = Obj[K] extends (...args: any[]) => void
  ? ReturnType<Obj[K]> extends void
    ? K
    : never
  : never;
type AvailablePropOf<Ctx extends object> = {
  [K in keyof Ctx]: AvailablePropImpl<Ctx, K>;
}[keyof Ctx];
type SkillContextShortcutProps<
  Ext extends object,
  CallerType extends ExEntityType,
> = AvailablePropOf<ExtendedSkillContext<false, Ext, CallerType>>;

// 所有返回 void 的方法的参数类型
type SkillContextShortcutArgs<
  Ext extends object,
  CallerType extends ExEntityType,
  K extends keyof ExtendedSkillContext<false, Ext, CallerType>,
> = ExtendedSkillContext<false, Ext, CallerType>[K] extends (
  ...args: infer Args
) => void
  ? Args
  : never;

// 带有直达方法的 Builder，使用 `enableShortcut` 生成
export type BuilderWithShortcut<
  Ext extends object,
  CallerType extends ExEntityType,
  Original extends SkillBuilder<Ext, CallerType>,
> = Original & {
  [K in SkillContextShortcutProps<Ext, CallerType>]: (
    ...args: SkillContextShortcutArgs<Ext, CallerType, K>
  ) => BuilderWithShortcut<Ext, CallerType, Original>;
};

type ExtractTArgs<T> = T extends {
  [EXT_TYPE_HELPER]: infer Ext;
  [CALLER_TYPE_HELPER]: infer CallerType;
}
  ? readonly [Ext, CallerType]
  : readonly [never, never];

const SHORTCUT_RETURN_VALUE: unique symbol = Symbol();

/**
 * 为 Builder 添加直达 SkillContext 的函数，即可
 * `.do((c) => c.PROP(ARGS))`
 * 直接简写为
 * `.PROP(ARGS)`
 */
export function enableShortcut<T extends SkillBuilder<any, any>>(
  original: T,
): BuilderWithShortcut<ExtractTArgs<T>[0], ExtractTArgs<T>[1], T> {
  const proxy = new Proxy(original, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      } else {
        return function (this: T, ...args: any[]) {
          // returning true for counting usage
          return this.do((c) => (c[prop](...args), SHORTCUT_RETURN_VALUE));
        };
      }
    },
  });
  return proxy as any;
}

interface UsageOptions extends VariableOptions {
  /** 设置变量名。默认的变量名为 `usage`；如果该变量名已被占用，则会在后面加上 `_${skillId}`。*/
  name?: string;
  /** 是否为“每回合使用次数”。默认值为 `false`。 */
  perRound?: boolean;
  /** 是否在每次技能执行完毕后自动 -1。默认值为 `true`。 */
  auto?: boolean;
}

export class TriggeredSkillBuilder<
  Ext extends object,
  CallerType extends EntityType,
  EN extends DetailedEventNames,
  V extends string,
> extends SkillBuilder<Ext, CallerType> {
  private _triggerFilter: SkillFilter<Ext, CallerType>;
  constructor(
    id: number,
    private readonly triggerOn: EN,
    private readonly parent: EntityBuilder<CallerType, V>,
    triggerFilter: SkillFilter<Ext, CallerType> = () => true,
  ) {
    super(id);
    const [, filterDescriptor] = detailedEventDictionary[this.triggerOn];
    this._triggerFilter = (c, e) => {
      const { area, state } = c.caller();
      return (
        filterDescriptor(c as any, {
          callerArea: area,
          callerId: state.id,
          listenTo: this._listenTo,
        }) && triggerFilter(c, e)
      );
    };
  }
  private _usageOpt: Required<UsageOptions> | null = null;
  private _listenTo: ListenTo = ListenTo.SameArea;

  override do(op: SkillOperation<Ext, CallerType>): this {
    // 设置了每回合使用次数的技能，在没有剩余使用次数时不进行操作
    if (this._usageOpt?.perRound) {
      const { name } = this._usageOpt;
      return super.do((c, e) => {
        if (c.caller().state.variables[name] <= 0) {
          return;
        }
        op(c, e);
      });
    } else {
      return super.do(op);
    }
  }

  /**
   * 为实体创建名为 `usage` 的变量，表示剩余使用次数。
   * 在每次技能执行完毕后，若该变量计数达到 0，则弃置该实体。
   * @param count
   * @param opt @see UsageOptions
   * @returns
   */
  usage(count: number, opt?: UsageOptions): this {
    if (this._usageOpt !== null) {
      throw new Error(`Usage called twice`);
    }
    const perRound = opt?.perRound ?? false;
    const name =
      opt?.name ??
      // @ts-expect-error private prop
      ("usage" in this.parent._constants ? `usage_${this.id}` : "usage");
    this.parent.variable(name, count, opt);
    if (perRound) {
      // @ts-expect-error private prop
      this.parent._usagePerRoundVarNames.push(this._usagePerRoundName);
    }
    this._usageOpt = {
      visible: opt?.visible ?? true,
      auto: opt?.auto ?? true,
      name,
      perRound,
      recreateMax: opt?.recreateMax ?? count,
    };
    return this;
  }
  /**
   * Same as
   * ```
   *   .usage(count, { ...opt, perRound: true })
   * ```
   */
  usagePerRound(count: number, opt?: Omit<UsageOptions, "perRound">) {
    return this.usage(count, { ...opt, perRound: true });
  }

  listenToMySelf(): this {
    this._listenTo = ListenTo.Myself;
    return this;
  }

  listenToPlayer(): this {
    this._listenTo = ListenTo.SamePlayer;
    return this;
  }

  listenToAll(): this {
    this._listenTo = ListenTo.All;
    return this;
  }

  protected override getExtension(
    ctx: SkillContext<false, {}, CallerType>,
    arg: any,
  ) {
    let result: any;
    if ("state" in arg) {
      result = {
        eventArg: arg,
      };
    } else {
      result = arg;
    }
    return result;
  }

  private buildSkill() {
    if (this._usageOpt) {
      const { name, auto, perRound } = this._usageOpt;
      this.do((c) => {
        if (auto) {
          c.addVariable(name, -1);
        }
        // 带使用次数（非每回合重置的），次数耗尽时弃置
        if (!perRound && c.caller().state.variables[name] <= 0) {
          c.dispose();
        }
      });
    }
    const [eventName] = detailedEventDictionary[this.triggerOn];
    const filter: TriggeredSkillFilter<any> = (state, caller, arg) => {
      const ctx = this.getContext(state, caller, arg);
      return !!this._triggerFilter(ctx as any, arg);
    };
    const action: SkillDescription<any> = (state, skillInfo, arg) => {
      return this.getAction(arg)(state, skillInfo);
    };
    const def: TriggeredSkillDefinition = {
      type: "skill",
      skillType: null,
      id: this.id,
      triggerOn: eventName,
      requiredCost: [],
      filter,
      action,
    };
    registerSkill(def);
    // @ts-expect-error private prop
    this.parent._skillList.push(def);
  }

  on<E extends DetailedEventNames>(
    event: E,
    filter?: SkillFilter<ExtOfEntity<V, E>, CallerType>,
  ) {
    this.buildSkill();
    return this.parent.on(event, filter);
  }
  once<E extends DetailedEventNames>(
    event: E,
    filter?: SkillFilter<ExtOfEntity<V, E>, CallerType>,
  ) {
    this.buildSkill();
    return this.parent.once(event, filter);
  }

  done(): HandleT<CallerType> {
    this.buildSkill();
    return this.parent.done();
  }
}

export abstract class SkillBuilderWithCost<
  Ext extends object,
> extends SkillBuilder<Ext, "character"> {
  constructor(skillId: number) {
    super(skillId);
  }
  protected _cost: DiceType[] = [];
  private cost(type: DiceType, count: number): this {
    this._cost.push(...Array(count).fill(type));
    return this;
  }
  costVoid(count: number) {
    return this.cost(DiceType.Void, count);
  }
  costCryo(count: number) {
    return this.cost(DiceType.Cryo, count);
  }
  costHydro(count: number) {
    return this.cost(DiceType.Hydro, count);
  }
  costPyro(count: number) {
    return this.cost(DiceType.Pyro, count);
  }
  costElectro(count: number) {
    return this.cost(DiceType.Electro, count);
  }
  costAnemo(count: number) {
    return this.cost(DiceType.Anemo, count);
  }
  costGeo(count: number) {
    return this.cost(DiceType.Geo, count);
  }
  costDendro(count: number) {
    return this.cost(DiceType.Dendro, count);
  }
  costSame(count: number) {
    return this.cost(DiceType.Same, count);
  }
  costEnergy(count: number) {
    return this.cost(DiceType.Energy, count);
  }
}

class InitiativeSkillBuilder extends SkillBuilderWithCost<{}> {
  private _skillType: SkillType = "normal";
  private _gainEnergy = true;
  protected _cost: DiceType[] = [];
  constructor(private readonly skillId: number) {
    super(skillId);
  }

  protected override getExtension(
    skillCtx: SkillContext<false, {}, "character">,
    arg?: any,
  ) {
    return {};
  }

  noEnergy(): this {
    this._gainEnergy = false;
    return this;
  }

  type(type: "passive"): EntityBuilder<"passiveSkill">;
  type(type: CommonSkillType): this;
  type(type: CommonSkillType | "passive"): any {
    if (type === "passive") {
      return new EntityBuilder("passiveSkill", this.skillId);
    }
    if (type === "burst") {
      this._gainEnergy = false;
    }
    this._skillType = type;
    return this;
  }

  done(): SkillHandle {
    if (this._gainEnergy) {
      this.do((c) => c.gainEnergy(1, "@self"));
    }
    const action: SkillDescription<void> = this.getAction(() => ({}));
    registerSkill({
      type: "skill",
      skillType: this._skillType,
      id: this.skillId,
      triggerOn: null,
      requiredCost: this._cost,
      action,
    });
    return this.skillId as SkillHandle;
  }
}

export function skill(id: number) {
  return enableShortcut(new InitiativeSkillBuilder(id));
}
