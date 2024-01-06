import {
  Action,
  CardData,
  CharacterData,
  EntityData,
  Event,
  ExposedMutation,
  NotificationMessage,
  PlayCardHint,
  PlayerData,
  RpcMethod,
  RpcRequest,
  RpcResponse,
  StateData,
} from "@gi-tcg/typings";
import { CardState, CharacterState, EntityState, GameState } from ".";
import { Mutation } from "./base/mutation";
import { ActionInfo } from "./base/skill";

export interface PlayerIO {
  giveUp: boolean;
  notify: (notification: NotificationMessage) => void;
  rpc: <M extends RpcMethod>(
    method: M,
    data: RpcRequest[M],
  ) => Promise<RpcResponse[M]>;
}

export interface GameIO {
  pause: (st: GameState) => Promise<unknown>;
  players: [PlayerIO, PlayerIO];
}

export function exposeMutation(
  who: 0 | 1,
  m: Mutation,
): ExposedMutation | null {
  switch (m.type) {
    case "stepRandom":
    case "clearMutationLog":
    case "pushSkillLog":
    case "clearSkillLog":
      return null;
    case "changePhase":
      return m;
    case "stepRound":
      return m;
    case "switchTurn":
      return m;
    case "setWinner":
      return m;
    case "transferCard": {
      return {
        type: "transferCard",
        path: m.path,
        who: m.who,
        id: m.value.id,
        definitionId: m.who === who ? m.value.definition.id : 0,
      };
    }
    case "switchActive": {
      return {
        type: "switchActive",
        who: m.who,
        id: m.value.id,
        definitionId: m.value.definition.id,
      };
    }
    case "disposeCard": {
      return {
        type: "disposeCard",
        who: m.who,
        used: m.used,
        id: m.oldState.id,
        definitionId: m.oldState.definition.id,
      };
    }
    case "createCard": {
      return {
        type: "createCard",
        who: m.who,
        id: m.value.id,
        definitionId:
          m.who === who && m.target === "hands" ? m.value.definition.id : 0,
        target: m.target,
      };
    }
    case "createCharacter": {
      return {
        type: "createCharacter",
        who: m.who,
        id: m.value.id,
        definitionId: m.value.definition.id,
      };
    }
    case "createEntity": {
      return {
        type: "createEntity",
        id: m.value.id,
        definitionId: m.value.definition.id,
      };
    }
    case "disposeEntity": {
      return {
        type: "disposeEntity",
        id: m.oldState.id,
        definitionId: m.oldState.definition.id,
      };
    }
    case "modifyEntityVar": {
      return {
        type: "modifyEntityVar",
        id: m.state.id,
        definitionId: m.state.definition.id,
        varName: m.varName,
        value: m.value,
      };
    }
    case "replaceCharacterDefinition": {
      return {
        type: "replaceCharacterDefinition",
        id: m.state.id,
        newDefinitionId: m.newDefinition.id,
      };
    }
    case "resetDice": {
      return {
        type: "resetDice",
        who: m.who,
        value: m.who === who ? m.value : [...m.value].fill(0),
      };
    }
    case "setPlayerFlag": {
      if (["declareEnd", "legendUsed"].includes(m.flagName)) {
        return {
          type: "setPlayerFlag",
          who: m.who,
          flagName: m.flagName as any,
          value: m.value,
        };
      } else {
        return null;
      }
    }
    default: {
      const _check: never = m;
      return null;
    }
  }
}

function exposeEntity(e: EntityState): EntityData {
  return {
    id: e.id,
    definitionId: e.definition.id,
    variable: e.definition.visibleVarName ? e.variables[e.definition.visibleVarName] ?? null : null,
    hintIcon: e.variables.hintIcon ?? null,
    hintText: e.definition.hintText,
  };
}

function exposeCard(c: CardState, hide: boolean): CardData {
  return {
    id: c.id,
    definitionId: hide ? 0 : c.definition.id,
  };
}

function exposeCharacter(ch: CharacterState): CharacterData {
  return {
    id: ch.id,
    definitionId: ch.definition.id,
    defeated: !ch.variables.alive,
    entities: ch.entities.map(exposeEntity),
    health: ch.variables.health,
    energy: ch.variables.energy,
    aura: ch.variables.aura,
  };
}

export function exposeState(who: 0 | 1, state: GameState): StateData {
  return {
    phase: state.phase,
    currentTurn: state.currentTurn,
    roundNumber: state.roundNumber,
    winner: state.winner,
    players: state.players.map<PlayerData>((p, i) => ({
      activeCharacterId: p.activeCharacterId,
      piles: p.piles.map((c) => exposeCard(c, true)),
      hands: p.hands.map((c) => exposeCard(c, i !== who)),
      characters: p.characters.map(exposeCharacter),
      dice: i === who ? [...p.dice] : [...p.dice].fill(0),
      combatStatuses: p.combatStatuses.map(exposeEntity),
      supports: p.supports.map(exposeEntity),
      summons: p.summons.map(exposeEntity),
      declaredEnd: p.declaredEnd,
      legendUsed: p.legendUsed,
    })) as [PlayerData, PlayerData],
  };
}

export function exposeAction(action: ActionInfo): Action {
  switch (action.type) {
    case "useSkill": {
      return {
        type: "useSkill",
        skill: action.skill.definition.id,
        cost: action.cost,
      };
    }
    case "playCard": {
      return {
        type: "playCard",
        card: action.card.id,
        cost: action.cost,
        // We can provide more detail hint here
        hints: [PlayCardHint.GeneralTarget, PlayCardHint.GeneralTarget2],
        targets: action.target.ids,
      };
    }
    case "switchActive":
      return {
        type: "switchActive",
        active: action.to.id,
        cost: action.cost,
      };
    case "elementalTuning":
      return {
        type: "elementalTuning",
        discardedCard: action.card.id,
      };
    case "declareEnd": {
      return {
        type: "declareEnd",
      };
    }
  }
}
