// Copyright (C) 2024 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { DamageType, DiceType, Reaction } from "@gi-tcg/typings";

import {
  EntityArea,
  EntityType,
  ExEntityType,
  USAGE_PER_ROUND_VARIABLE_NAMES,
} from "../base/entity";
import { Mutation, applyMutation } from "../base/mutation";
import {
  DamageInfo,
  EntityEventArg,
  EventAndRequest,
  EventAndRequestConstructorArgs,
  EventAndRequestNames,
  EventArgOf,
  HealInfo,
  InlineEventNames,
  ModifyDamage0EventArg,
  ModifyDamage1EventArg,
  SkillDescription,
  SkillInfo,
  constructEventAndRequestArg,
} from "../base/skill";
import {
  AnyState,
  CardState,
  CharacterState,
  CharacterVariables,
  EntityState,
  EntityVariables,
  GameState,
} from "../base/state";
import {
  allEntities,
  allEntitiesAtArea,
  drawCard,
  elementOfCharacter,
  getActiveCharacterIndex,
  getEntityArea,
  getEntityById,
  sortDice,
} from "../util";
import { executeQuery } from "../query";
import {
  AppliableDamageType,
  CardHandle,
  CharacterHandle,
  CombatStatusHandle,
  EquipmentHandle,
  HandleT,
  SkillHandle,
  StatusHandle,
  SummonHandle,
  TypedExEntity,
} from "./type";
import { CardTag } from "../base/card";
import { GuessedTypeOfQuery } from "../query/types";
import { NontrivialDamageType, REACTION_MAP } from "../base/reaction";
import {
  CALLED_FROM_REACTION,
  OptionalDamageInfo,
  getReactionDescription,
} from "./reaction";
import { flip } from "@gi-tcg/utils";
import { GiTcgCoreInternalError, GiTcgDataError } from "../error";

type CharacterTargetArg = CharacterState | CharacterState[] | string;
type EntityTargetArg = EntityState | EntityState[] | string;

interface DrawCardsOpt {
  who?: "my" | "opp";
  withTag?: CardTag | null;
}

export type ContextMetaBase = {
  readonly: boolean;
  eventArgType: unknown;
  callerVars: string;
  callerType: ExEntityType;
};

/**
 * 用于描述技能的上下文对象。
 * 它们出现在 `.do()` 形式内，将其作为参数传入。
 */
export class SkillContext<Meta extends ContextMetaBase> {
  private readonly eventAndRequests: EventAndRequest[] = [];
  public readonly callerArea: EntityArea;

  /**
   * 获取正在执行逻辑的实体的 `CharacterContext` 或 `EntityContext`。
   * @returns
   */
  public readonly self: TypedExEntity<Meta, Meta["callerType"]>;

  /**
   *
   * @param _state 触发此技能之前的游戏状态
   * @param skillInfo
   */
  constructor(
    private _state: GameState,
    public readonly skillInfo: SkillInfo,
    public readonly eventArg: Meta["eventArgType"] extends object
      ? Omit<Meta["eventArgType"], `_${string}`>
      : Meta["eventArgType"],
  ) {
    this.callerArea = getEntityArea(_state, skillInfo.caller.id);
    this.self = this.of(this.skillInfo.caller);
  }
  get state() {
    return this._state;
  }
  get player() {
    return this._state.players[this.callerArea.who];
  }
  get oppPlayer() {
    return this._state.players[flip(this.callerArea.who)];
  }
  private get callerState(): CharacterState | EntityState {
    return getEntityById(this._state, this.skillInfo.caller.id, true);
  }
  isMyTurn() {
    return this._state.currentTurn === this.callerArea.who;
  }

  private handleInlineEvent<E extends InlineEventNames>(
    event: E,
    arg: EventArgOf<E>,
  ) {
    const entities = allEntities(this.state, true);
    const infos = entities
      .flatMap((e) =>
        e.definition.skills
          .filter((s) => s.triggerOn === event)
          .map((s) => [e, s] as const),
      )
      .map<SkillInfo>(([e, s]) => ({
        caller: e,
        definition: s,
        fromCard: null,
        requestBy: null,
        charged: false,
        plunging: false,
      }));
    for (const info of infos) {
      arg._currentSkillInfo = info;
      try {
        getEntityById(this.state, info.caller.id, true);
      } catch {
        continue;
      }
      if (
        "filter" in info.definition &&
        !(0, info.definition.filter)(this.state, info, arg)
      ) {
        continue;
      }
      const desc = info.definition.action as SkillDescription<EventArgOf<E>>;
      let newEvents;
      [this._state, newEvents] = desc(this.state, info, arg);
      this.eventAndRequests.push(...newEvents);
    }
  }

  $<const Q extends string>(
    arg: Q,
  ): TypedExEntity<Meta, GuessedTypeOfQuery<Q>> | undefined {
    const result = this.$$(arg);
    return result[0];
  }

  $$<const Q extends string>(
    arg: Q,
  ): TypedExEntity<Meta, GuessedTypeOfQuery<Q>>[] {
    return executeQuery(this, arg);
  }

  // Get context of given entity state
  of(entityState: EntityState): Entity<Meta>;
  of(entityState: CharacterState): Character<Meta>;
  of<T extends ExEntityType = ExEntityType>(
    entityId: EntityState | CharacterState | number,
  ): TypedExEntity<Meta, T>;
  of(entityState: EntityState | CharacterState | number): unknown {
    if (typeof entityState === "number") {
      entityState = getEntityById(this._state, entityState, true);
    }
    if (entityState.definition.type === "character") {
      return new Character(this, entityState.id);
    } else {
      return new Entity(this, entityState.id);
    }
  }

  private queryOrOf<TypeT extends ExEntityType>(
    q: AnyState | AnyState[] | string,
  ): TypedExEntity<Meta, TypeT>[] {
    if (Array.isArray(q)) {
      return q.map((s) => this.of(s));
    } else if (typeof q === "string") {
      return this.$$(q) as TypedExEntity<Meta, TypeT>[];
    } else {
      return [this.of(q)];
    }
  }

  private queryCoerceToCharacters(
    arg: CharacterTargetArg,
  ): TypedCharacter<Meta>[] {
    const result = this.queryOrOf(arg);
    for (const r of result) {
      if (r instanceof Character) {
        continue;
      } else {
        throw new GiTcgDataError(
          `Expected character target, but query ${arg} found noncharacter entities`,
        );
      }
    }
    return result as TypedCharacter<Meta>[];
  }
  /** 本回合已经使用了几次此技能 */
  countOfThisSkill(): number {
    return this.countOfSkill(
      this.skillInfo.caller.id,
      this.skillInfo.definition.id as SkillHandle,
    );
  }
  countOfSkill(callerId: number, handle: SkillHandle): number {
    return this.state.globalUseSkillLog.filter(
      ({ roundNumber, skill }) =>
        roundNumber === this.state.roundNumber &&
        skill.caller.id === callerId &&
        skill.definition.id === handle,
    ).length;
  }

  // MUTATIONS

  get events() {
    return this.eventAndRequests;
  }

  mutate(...mutations: Mutation[]) {
    for (const m of mutations) {
      this._state = applyMutation(this._state, m);
    }
  }

  emitEvent<E extends EventAndRequestNames>(
    event: E,
    ...args: EventAndRequestConstructorArgs<E>
  ) {
    const arg = constructEventAndRequestArg(event, ...args);
    this.eventAndRequests.push([event, arg] as any);
  }

  switchActive(target: CharacterTargetArg) {
    const targets = this.queryCoerceToCharacters(target);
    if (targets.length !== 1) {
      throw new GiTcgDataError(
        "Expected exactly one target when switching active",
      );
    }
    const switchToTarget = targets[0];
    const playerWho = switchToTarget.who;
    const from =
      this.state.players[playerWho].characters[
        getActiveCharacterIndex(this.state.players[playerWho])
      ];
    if (from.id === switchToTarget.id) {
      return;
    }
    this.mutate({
      type: "switchActive",
      who: playerWho,
      value: switchToTarget.state,
    });
    this.emitEvent("onSwitchActive", this.state, {
      type: "switchActive",
      who: playerWho,
      from: from,
      to: switchToTarget.state,
    });
  }

  gainEnergy(value: number, target: CharacterTargetArg) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      const targetState = t.state;
      const finalValue = Math.min(
        value,
        targetState.variables.maxEnergy - targetState.variables.energy,
      );
      this.mutate({
        type: "modifyEntityVar",
        state: targetState,
        varName: "energy",
        value: targetState.variables.energy + finalValue,
      });
    }
  }

  /** 治疗角色。若角色已倒下，则复苏该角色。*/
  heal(value: number, target: CharacterTargetArg) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      let damageType: DamageType.Heal | DamageType.Revive = DamageType.Heal;
      const targetState = t.state;
      if (targetState.variables.alive === 0) {
        this.mutate({
          type: "modifyEntityVar",
          state: targetState,
          varName: "alive",
          value: 1,
        });
        damageType = DamageType.Revive;
        this.emitEvent("onRevive", this.state, targetState);
      }
      const targetInjury =
        targetState.variables.maxHealth - targetState.variables.health;
      const finalValue = Math.min(value, targetInjury);
      this.mutate({
        type: "modifyEntityVar",
        state: targetState,
        varName: "health",
        value: targetState.variables.health + finalValue,
      });
      const healInfo: HealInfo = {
        type: damageType,
        expectedValue: value,
        value: finalValue,
        source: this.callerState,
        via: this.skillInfo,
        target: targetState,
        roundNumber: this.state.roundNumber,
        fromReaction: null,
      };
      this.mutate({
        type: "pushDamageLog",
        damage: healInfo,
      });
      this.emitEvent("onDamageOrHeal", this.state, healInfo);
    }
  }

  damage(
    type: Exclude<DamageType, DamageType.Revive>,
    value: number,
    target: CharacterTargetArg = "opp active",
  ) {
    if (type === DamageType.Heal) {
      return this.heal(value, target);
    }
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      const targetState = t.state;
      let damageInfo: DamageInfo = {
        source: this.skillInfo.caller,
        target: targetState,
        type,
        value,
        via: this.skillInfo,
        roundNumber: this.state.roundNumber,
        fromReaction: this.fromReaction,
      };
      if (type !== DamageType.Piercing) {
        const modifier0 = new ModifyDamage0EventArg(this.state, damageInfo);
        this.handleInlineEvent("modifyDamage0", modifier0);
        damageInfo = modifier0.damageInfo;

        if (
          damageInfo.type !== DamageType.Physical &&
          damageInfo.type !== DamageType.Piercing
        ) {
          damageInfo = this.doApply(t, damageInfo.type, damageInfo);
        }

        const modifier1 = new ModifyDamage1EventArg(this.state, damageInfo);
        this.handleInlineEvent("modifyDamage1", modifier1);
        damageInfo = modifier1.damageInfo;
      }

      const finalHealth = Math.max(
        0,
        targetState.variables.health - damageInfo.value,
      );
      this.mutate({
        type: "modifyEntityVar",
        state: targetState,
        varName: "health",
        value: finalHealth,
      });
      this.mutate({
        type: "pushDamageLog",
        damage: damageInfo,
      });
      this.emitEvent("onDamageOrHeal", this.state, damageInfo);
    }
  }

  /**
   * 为某角色附着元素。
   * @param type 附着的元素类型
   * @param target 角色目标
   */
  apply(type: AppliableDamageType, target: CharacterTargetArg) {
    const characters = this.queryCoerceToCharacters(target);
    for (const ch of characters) {
      this.doApply(ch, type);
    }
  }

  private get fromReaction(): Reaction | null {
    return (this as any)[CALLED_FROM_REACTION] ?? null;
  }

  private doApply(
    target: TypedCharacter<Meta>,
    type: NontrivialDamageType,
    damage?: DamageInfo,
  ): DamageInfo {
    const aura = target.state.variables.aura;
    const [newAura, reaction] = REACTION_MAP[aura][type];
    this.mutate({
      type: "modifyEntityVar",
      state: target.state,
      varName: "aura",
      value: newAura,
    });
    const optDamageInfo: OptionalDamageInfo = damage
      ? {
          ...damage,
          isDamage: true,
        }
      : {
          type,
          value: 0,
          source: this.skillInfo.caller,
          via: this.skillInfo,
          target: target.state,
          isDamage: false,
          roundNumber: this.state.roundNumber,
          fromReaction: this.fromReaction,
        };
    const damageModifier = new ModifyDamage0EventArg(this.state, optDamageInfo);
    damageModifier._currentSkillInfo = this.skillInfo;
    if (reaction !== null) {
      this.emitEvent("onReaction", this.state, {
        type: reaction,
        via: this.skillInfo,
        target: target.state,
        damage,
      });
      const reactionDescription = getReactionDescription(reaction);
      const [newState, events] = reactionDescription(
        this._state,
        this.skillInfo,
        damageModifier,
      );
      this.eventAndRequests.push(...events);
      this._state = newState;
    }
    return damageModifier.damageInfo;
  }

  createEntity<TypeT extends EntityType>(
    type: TypeT,
    id: HandleT<TypeT>,
    area?: EntityArea,
    opt: CreateEntityOptions = {},
  ): Entity<Meta> | null {
    const id2 = id as number;
    const def = this._state.data.entities.get(id2);
    if (typeof def === "undefined") {
      throw new GiTcgDataError(`Unknown entity definition id ${id2}`);
    }
    if (typeof area === "undefined") {
      switch (type) {
        case "combatStatus":
          area = {
            type: "combatStatuses",
            who: this.callerArea.who,
          };
          break;
        case "summon":
          area = {
            type: "summons",
            who: this.callerArea.who,
          };
          break;
        case "support":
          area = {
            type: "supports",
            who: this.callerArea.who,
          };
          break;
        default:
          throw new GiTcgDataError(
            `Creating entity of type ${type} requires explicit area`,
          );
      }
    }
    const entitiesAtArea = allEntitiesAtArea(this._state, area);
    // handle immuneControl vs disableSkill;
    // do not generate Frozen etc. on those characters
    const immuneControl = entitiesAtArea.find(
      (e) =>
        e.definition.type === "status" &&
        e.definition.tags.includes("immuneControl"),
    );
    if (
      immuneControl &&
      def.type === "status" &&
      def.tags.includes("disableSkill")
    ) {
      return null;
    }
    const oldOne = entitiesAtArea.find(
      (e): e is EntityState =>
        e.definition.type !== "character" &&
        e.definition.type !== "support" &&
        e.definition.id === id2,
    );
    const { varConfigs } = def;
    const overrideVariables = opt.overrideVariables ?? {};
    if (oldOne) {
      const newValues: Record<string, number> = {};
      // refresh exist entity's variable
      for (const name in varConfigs) {
        let { initialValue, recreateBehavior } = varConfigs[name];
        if (typeof overrideVariables[name] === "number") {
          initialValue = overrideVariables[name]!;
        }
        const oldValue = oldOne.variables[name] ?? 0;
        switch (recreateBehavior.type) {
          case "overwrite": {
            newValues[name] = initialValue;
            break;
          }
          case "takeMax": {
            newValues[name] = Math.max(initialValue, oldValue ?? 0);
            break;
          }
          case "append": {
            const appendResult = recreateBehavior.appendValue + oldValue;
            newValues[name] = Math.min(
              appendResult,
              recreateBehavior.appendLimit,
            );
          }
        }
      }
      for (const [name, value] of Object.entries(newValues)) {
        if (Reflect.has(oldOne.variables, name)) {
          this.mutate({
            type: "modifyEntityVar",
            state: oldOne,
            varName: name,
            value,
          });
        }
      }
      const newState = getEntityById(this.state, oldOne.id);
      this.emitEvent("onEnter", this.state, {
        newState,
        overrided: oldOne,
      });
      return this.of(newState);
    } else {
      const initState: EntityState = {
        id: 0,
        definition: def,
        variables: Object.fromEntries(
          Object.entries(varConfigs).map(([name, { initialValue }]) => [
            name,
            initialValue,
          ]),
        ),
      };
      this.mutate({
        type: "createEntity",
        where: area,
        value: initState,
      });
      const newState = getEntityById(this._state, initState.id);
      this.emitEvent("onEnter", this.state, {
        newState,
        overrided: null,
      });
      return this.of(newState);
    }
  }
  summon(
    id: SummonHandle,
    where: "my" | "opp" = "my",
    opt: CreateEntityOptions = {},
  ) {
    if (where === "my") {
      this.createEntity("summon", id, void 0, opt);
    } else {
      this.createEntity(
        "summon",
        id,
        {
          type: "summons",
          who: flip(this.callerArea.who),
        },
        opt,
      );
    }
  }
  characterStatus(
    id: StatusHandle,
    target: CharacterTargetArg = "@self",
    opt: CreateEntityOptions = {},
  ) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      this.createEntity("status", id, t.area, opt);
    }
  }
  combatStatus(
    id: CombatStatusHandle,
    where: "my" | "opp" = "my",
    opt: CreateEntityOptions = {},
  ) {
    if (where === "my") {
      this.createEntity("combatStatus", id, void 0, opt);
    } else {
      this.createEntity(
        "combatStatus",
        id,
        {
          type: "combatStatuses",
          who: flip(this.callerArea.who),
        },
        opt,
      );
    }
  }

  transferEntity(target: EntityTargetArg, area: EntityArea) {
    const targets = this.queryOrOf(target);
    for (const target of targets) {
      if (target.state.definition.type === "character") {
        throw new GiTcgDataError(`Cannot transfer a character`);
      }
      const state = target.state as EntityState;
      this.mutate({
        type: "disposeEntity",
        oldState: state,
      });
      const newState = { ...state };
      this.mutate({
        type: "createEntity",
        value: newState,
        where: area,
      });
    }
  }

  dispose(target: EntityTargetArg = "@self") {
    const targets = this.queryOrOf(target);
    for (const t of targets) {
      const who = t.who;
      const entityState = t.state;
      if (entityState.definition.type === "character") {
        throw new GiTcgDataError(
          `Character caller cannot be disposed. You may forget an argument when calling \`dispose\``,
        );
      }
      this.handleInlineEvent(
        "onBeforeDispose",
        new EntityEventArg(this.state, entityState),
      );
      this.emitEvent("onDispose", this.state, entityState);
      this.mutate({
        type: "disposeEntity",
        oldState: entityState,
      });
      if (entityState.definition.type === "support") {
        this.mutate({
          type: "increaseDisposedSupportCount",
          who,
        });
      }
    }
  }

  // NOTICE: getVariable/setVariable/addVariable 应当将 caller 的严格版声明放在最后一个
  // 因为 (...args: infer R) 只能获取到重载列表中的最后一个，而严格版是 BuilderWithShortcut 需要的

  getVariable(prop: string, target: CharacterState | EntityState): number;
  getVariable(prop: Meta["callerVars"]): number;
  getVariable(prop: string, target?: CharacterState | EntityState) {
    if (target) {
      return this.of(target).getVariable(prop);
    } else {
      return this.self.getVariable(prop);
    }
  }

  setVariable(
    prop: string,
    value: number,
    target: CharacterState | EntityState,
  ): void;
  setVariable(prop: Meta["callerVars"], value: number): void;
  setVariable(prop: any, value: number, target?: CharacterState | EntityState) {
    target ??= this.callerState;
    this.mutate({
      type: "modifyEntityVar",
      state: target,
      varName: prop,
      value: value,
    });
  }

  addVariable(
    prop: string,
    value: number,
    target: CharacterState | EntityState,
  ): void;
  addVariable(prop: Meta["callerVars"], value: number): void;
  addVariable(prop: any, value: number, target?: CharacterState | EntityState) {
    target ??= this.callerState;
    const finalValue = value + target.variables[prop];
    this.setVariable(prop, finalValue, target);
  }

  addVariableWithMax(
    prop: string,
    value: number,
    maxLimit: number,
    target: CharacterState | EntityState,
  ): void;
  addVariableWithMax(
    prop: Meta["callerVars"],
    value: number,
    maxLimit: number,
  ): void;
  addVariableWithMax(
    prop: any,
    value: number,
    maxLimit: number,
    target?: CharacterState | EntityState,
  ) {
    target ??= this.callerState;
    const finalValue = Math.min(maxLimit, value + target.variables[prop]);
    this.setVariable(prop, finalValue, target);
  }
  consumeUsage(count = 1, target?: EntityState) {
    if (typeof target === "undefined") {
      if (this.callerState.definition.type === "character") {
        throw new GiTcgDataError(`Cannot consume usage of character`);
      }
      target = this.callerState as EntityState;
    }
    if (!Reflect.has(target.definition.varConfigs, "usage")) {
      return;
    }
    const current = this.getVariable("usage", this.callerState);
    if (current > 0) {
      this.addVariable("usage", -Math.min(count, current), target);
      if (
        Reflect.has(target.definition.varConfigs, "disposeWhenUsageIsZero") &&
        this.getVariable("usage", target) <= 0
      ) {
        this.dispose(target);
      }
    }
  }
  consumeUsagePerRound(count = 1) {
    if (!("usagePerRoundVariableName" in this.skillInfo.definition)) {
      throw new GiTcgDataError(`This skill do not have usagePerRound`);
    }
    const varName = this.skillInfo.definition.usagePerRoundVariableName;
    if (varName === null) {
      throw new GiTcgDataError(`This skill do not have usagePerRound`);
    }
    const current = this.getVariable(varName, this.callerState);
    if (current > 0) {
      this.addVariable(varName, -Math.min(count, current), this.callerState);
    }
  }

  replaceDefinition(target: CharacterTargetArg, newCh: CharacterHandle) {
    const characters = this.queryCoerceToCharacters(target);
    if (characters.length !== 1) {
      throw new GiTcgDataError(
        `Replace definition must apply on exact one character`,
      );
    }
    const ch = characters[0];
    const oldDef = ch.state.definition;
    const def = this._state.data.characters.get(newCh);
    if (typeof def === "undefined") {
      throw new GiTcgDataError(`Unknown character definition id ${newCh}`);
    }
    this.mutate({
      type: "replaceCharacterDefinition",
      state: characters[0].state,
      newDefinition: def,
    });
    this.emitEvent(
      "onReplaceCharacterDefinition",
      this.state,
      ch.state,
      oldDef,
      def,
    );
  }

  absorbDice(strategy: "seq" | "diff", count: number): DiceType[] {
    switch (strategy) {
      case "seq": {
        const newDice = this.player.dice.slice(0, count);
        this.mutate({
          type: "resetDice",
          who: this.callerArea.who,
          value: this.player.dice.slice(count),
        });
        return newDice;
      }
      case "diff": {
        const collected: DiceType[] = [];
        const dice = [...this.player.dice];
        for (let i = 0; i < count; i++) {
          let found = false;
          for (let j = 0; j < dice.length; j++) {
            // 万能骰子或者不重复的骰子
            if (dice[j] === DiceType.Omni || !collected.includes(dice[j])) {
              collected.push(dice[j]);
              dice.splice(j, 1);
              found = true;
              break;
            }
          }
          if (!found) {
            break;
          }
        }
        this.mutate({
          type: "resetDice",
          who: this.callerArea.who,
          value: dice,
        });
        return collected;
      }
      default: {
        const _: never = strategy;
        throw new GiTcgDataError(`Invalid strategy ${strategy}`);
      }
    }
  }
  generateDice(type: DiceType | "randomElement", count: number) {
    let insertedDice: DiceType[] = [];
    if (type === "randomElement") {
      const diceTypes = [
        DiceType.Anemo,
        DiceType.Cryo,
        DiceType.Dendro,
        DiceType.Electro,
        DiceType.Geo,
        DiceType.Hydro,
        DiceType.Pyro,
      ];
      for (let i = 0; i < count; i++) {
        const generated = this.random(...diceTypes);
        insertedDice.push(generated);
        diceTypes.splice(diceTypes.indexOf(generated), 1);
      }
    } else {
      insertedDice = new Array<DiceType>(count).fill(type);
    }
    const newDice = sortDice(this.player, [
      ...this.player.dice,
      ...insertedDice,
    ]);
    this.mutate({
      type: "resetDice",
      who: this.callerArea.who,
      value: newDice,
    });
  }

  createHandCard(cardId: CardHandle) {
    const cardDef = this._state.data.cards.get(cardId);
    if (typeof cardDef === "undefined") {
      throw new GiTcgDataError(`Unknown card definition id ${cardId}`);
    }
    const cardState: CardState = {
      id: 0,
      definition: cardDef,
    };
    const who = this.callerArea.who;
    this.mutate({
      type: "createCard",
      who,
      target: "hands",
      value: cardState,
    });
    if (this.player.hands.length > this._state.config.maxHands) {
      this.mutate({
        type: "disposeCard",
        who,
        oldState: cardState,
        used: false,
      });
    }
  }

  drawCards(count: number, opt?: DrawCardsOpt) {
    const { withTag = null, who: myOrOpt = "my" } = (opt ??= {});
    const who =
      myOrOpt === "my" ? this.callerArea.who : flip(this.callerArea.who);
    for (let i = 0; i < count; i++) {
      this._state = drawCard(this._state, who, withTag);
    }
  }
  switchCards() {
    this.emitEvent("requestSwitchHands", this.skillInfo, this.callerArea.who);
  }
  reroll(times: number) {
    this.emitEvent("requestReroll", this.skillInfo, this.callerArea.who, times);
  }
  useSkill(skill: SkillHandle | "normal") {
    const activeCh = this.$("active character")!.state;
    let skillId;
    if (skill === "normal") {
      const normalSkills = activeCh.definition.initiativeSkills.filter(
        (sk) => sk.skillType === "normal",
      );
      if (normalSkills.length === 0) {
        throw new GiTcgDataError(
          "Expected one normal skill on active character",
        );
      }
      skillId = normalSkills[0].id;
    } else {
      skillId = skill;
    }
    this.emitEvent("requestUseSkill", this.skillInfo, activeCh, skillId);
  }

  random<T>(...items: T[]): T {
    const mutation: Mutation = {
      type: "stepRandom",
      value: -1,
    };
    this.mutate(mutation);
    return items[mutation.value % items.length];
  }
}

type InternalProp = "callerArea";

type SkillContextMutativeProps =
  | "mutate"
  | "events"
  | "emitEvent"
  | "switchActive"
  | "gainEnergy"
  | "heal"
  | "damage"
  | "apply"
  | "createEntity"
  | "summon"
  | "combatStatus"
  | "characterStatus"
  | "dispose"
  | "setVariable"
  | "addVariable"
  | "addVariableWithMax"
  | "consumeUsage"
  | "consumeUsagePerRound"
  | "absorbDice"
  | "generateDice"
  | "createHandCard"
  | "drawCards"
  | "switchCards"
  | "reroll"
  | "useSkill";

/**
 * 所谓 `Typed` 是指，若 `Readonly` 则忽略那些可以改变游戏状态的方法。
 *
 * `TypedCharacter` 等同理。
 */
export type TypedSkillContext<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true
    ? Omit<SkillContext<Meta>, SkillContextMutativeProps | InternalProp>
    : Omit<SkillContext<Meta>, InternalProp>;

export type CharacterPosition = "active" | "next" | "prev" | "standby";

/**
 * 提供一些针对角色的便利方法，不需要 SkillContext 参与。
 * 仅当保证 GameState 不发生变化时使用。
 */
export class CharacterBase {
  protected _area: EntityArea;
  constructor(
    private gameState: GameState,
    protected readonly _id: number,
  ) {
    this._area = getEntityArea(gameState, _id);
  }
  get area() {
    return this._area;
  }
  get who() {
    return this._area.who;
  }
  get id() {
    return this._id;
  }
  positionIndex(currentState: GameState = this.gameState) {
    const player = currentState.players[this.who];
    const thisIdx = player.characters.findIndex((ch) => ch.id === this._id);
    if (thisIdx === -1) {
      throw new GiTcgCoreInternalError("Invalid character index");
    }
    return thisIdx;
  }
  satisfyPosition(
    pos: CharacterPosition,
    currentState: GameState = this.gameState,
  ) {
    const player = currentState.players[this.who];
    const activeIdx = getActiveCharacterIndex(player);
    const length = player.characters.length;
    let dx;
    switch (pos) {
      case "active":
        return player.activeCharacterId === this._id;
      case "standby":
        return player.activeCharacterId !== this._id;
      case "next":
        dx = 1;
        break;
      case "prev":
        dx = -1;
        break;
      default: {
        const _: never = pos;
        throw new GiTcgDataError(`Invalid position ${pos}`);
      }
    }
    // find correct next and prev index
    let currentIdx = activeIdx;
    do {
      currentIdx = (currentIdx + dx + length) % length;
    } while (!player.characters[currentIdx].variables.alive);
    return player.characters[currentIdx].id === this._id;
  }
}

interface CreateEntityOptions {
  overrideVariables?: Partial<EntityVariables>;
}

export class Character<Meta extends ContextMetaBase> extends CharacterBase {
  constructor(
    private readonly skillContext: SkillContext<Meta>,
    id: number,
  ) {
    super(skillContext.state, id);
  }

  get state(): CharacterState {
    const entity = getEntityById(this.skillContext.state, this._id, true);
    if (entity.definition.type !== "character") {
      throw new GiTcgCoreInternalError("Expected character");
    }
    return entity as CharacterState;
  }

  get health() {
    return this.getVariable("health");
  }
  get energy() {
    return this.getVariable("energy");
  }
  get aura() {
    return this.getVariable("aura");
  }
  positionIndex() {
    return super.positionIndex(this.skillContext.state);
  }
  satisfyPosition(pos: CharacterPosition) {
    return super.satisfyPosition(pos, this.skillContext.state);
  }
  isActive() {
    return this.satisfyPosition("active");
  }
  isMine() {
    return this.area.who === this.skillContext.callerArea.who;
  }
  fullEnergy() {
    return this.getVariable("energy") === this.getVariable("maxEnergy");
  }
  element(): DiceType {
    return elementOfCharacter(this.state.definition);
  }
  hasArtifact() {
    return this.state.entities.find(
      (v) =>
        v.definition.type === "equipment" &&
        v.definition.tags.includes("artifact"),
    );
  }
  hasWeapon(): EntityState | null {
    return (
      this.state.entities.find(
        (v) =>
          v.definition.type === "equipment" &&
          v.definition.tags.includes("weapon"),
      ) ?? null
    );
  }
  hasEquipment(id: EquipmentHandle): EntityState | null {
    return (
      this.state.entities.find(
        (v) => v.definition.type === "equipment" && v.definition.id === id,
      ) ?? null
    );
  }
  hasStatus(id: StatusHandle): EntityState | null {
    return (
      this.state.entities.find(
        (v) => v.definition.type === "status" && v.definition.id === id,
      ) ?? null
    );
  }

  $$<const Q extends string>(arg: Q) {
    return this.skillContext.$(`(${arg}) at (with id ${this._id})`);
  }

  // MUTATIONS

  gainEnergy(value = 1) {
    this.skillContext.gainEnergy(value, this.state);
  }
  heal(value: number) {
    this.skillContext.heal(value, this.state);
  }
  damage(type: Exclude<DamageType, DamageType.Revive>, value: number) {
    this.skillContext.damage(type, value, this.state);
  }
  apply(type: AppliableDamageType) {
    this.skillContext.apply(type, this.state);
  }
  addStatus(status: StatusHandle, opt?: CreateEntityOptions) {
    this.skillContext.createEntity("status", status, this._area, opt);
  }
  equip(equipment: EquipmentHandle) {
    // Remove exist artifact/weapon first
    for (const tag of ["artifact", "weapon"] as const) {
      if (
        this.skillContext.state.data.entities.get(equipment)?.tags.includes(tag)
      ) {
        const exist = this.state.entities.find((v) =>
          v.definition.tags.includes(tag),
        );
        if (exist) {
          this.skillContext.dispose(exist);
        }
      }
    }
    this.skillContext.createEntity("equipment", equipment, this._area);
  }
  removeArtifact(): EntityState | null {
    const entity = this.state.entities.find((v) =>
      v.definition.tags.includes("artifact"),
    );
    if (!entity) {
      return null;
    }
    this.skillContext.dispose(entity);
    return entity;
  }
  removeWeapon(): EntityState | null {
    const entity = this.state.entities.find((v) =>
      v.definition.tags.includes("weapon"),
    );
    if (!entity) {
      return null;
    }
    this.skillContext.dispose(entity);
    return entity;
  }
  loseEnergy(count = 1): number {
    const originalValue = this.state.variables.energy;
    const finalValue = Math.max(0, originalValue - count);
    this.skillContext.setVariable("energy", finalValue, this.state);
    return originalValue - finalValue;
  }
  getVariable<Name extends string>(name: Name): CharacterVariables[Name] {
    return this.state.variables[name];
  }

  setVariable(prop: string, value: number) {
    this.skillContext.setVariable(prop, value, this.state);
  }
  addVariable(prop: string, value: number) {
    this.skillContext.addVariable(prop, value, this.state);
  }
  addVariableWithMax(prop: string, value: number, maxLimit: number) {
    this.skillContext.addVariableWithMax(prop, value, maxLimit, this.state);
  }
  dispose(): never {
    throw new GiTcgDataError(`Cannot dispose character (or passive skill)`);
  }
}

type CharacterMutativeProps =
  | "gainEnergy"
  | "heal"
  | "damage"
  | "apply"
  | "addStatus"
  | "equip"
  | "removeArtifact"
  | "removeWeapon"
  | "setVariable"
  | "addVariable"
  | "addVariableWithMax"
  | "dispose";

export type TypedCharacter<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true
    ? Omit<Character<Meta>, CharacterMutativeProps>
    : Character<Meta>;

export class Entity<Meta extends ContextMetaBase> {
  private readonly _area: EntityArea;
  constructor(
    private readonly skillContext: SkillContext<Meta>,
    public readonly id: number,
  ) {
    this._area = getEntityArea(skillContext.state, id);
  }

  get state(): EntityState {
    return getEntityById(this.skillContext.state, this.id);
  }
  get area(): EntityArea {
    return this._area;
  }
  get who() {
    return this._area.who;
  }
  isMine() {
    return this.area.who === this.skillContext.callerArea.who;
  }
  getVariable<Name extends string>(name: Name): EntityVariables[Name] {
    return this.state.variables[name];
  }

  master() {
    if (this._area.type !== "characters") {
      throw new GiTcgDataError("master() expect a character area");
    }
    return new Character<Meta>(this.skillContext, this._area.characterId);
  }

  setVariable(prop: string, value: number) {
    this.skillContext.setVariable(prop, value, this.state);
  }
  addVariable(prop: string, value: number) {
    this.skillContext.addVariable(prop, value, this.state);
  }
  addVariableWithMax(prop: string, value: number, maxLimit: number) {
    this.skillContext.addVariableWithMax(prop, value, maxLimit, this.state);
  }
  consumeUsage(count = 1) {
    this.skillContext.consumeUsage(count, this.state);
  }
  resetUsagePerRound() {
    for (const [name, cfg] of Object.entries(
      this.state.definition.varConfigs,
    )) {
      if (
        (USAGE_PER_ROUND_VARIABLE_NAMES as readonly string[]).includes(name)
      ) {
        this.setVariable(name, cfg.initialValue);
      }
    }
  }
  dispose() {
    this.skillContext.dispose(this.state);
  }
}

type EntityMutativeProps =
  | "setVariable"
  | "addVariable"
  | "addVariableWithMax"
  | "consumeUsage"
  | "resetUsagePerRound"
  | "dispose";

export type TypedEntity<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true
    ? Omit<Entity<Meta>, EntityMutativeProps>
    : Entity<Meta>;
