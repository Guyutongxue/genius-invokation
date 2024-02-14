import minstd from "@stdlib/random-base-minstd";
import { DiceType, PhaseType } from "@gi-tcg/typings";
import {
  CardHandle,
  CharacterHandle,
  CharacterState,
  EntityState,
} from "../../src/builder";
import { HandleT } from "../../src/builder/type";
import { EntityType, EntityVariables } from "../../src/base/entity";
import {
  CharacterDefinition,
  CharacterVariables,
} from "../../src/base/character";
import { AnyState, CardState, GameState } from "../../src";
import { DataStore } from "../../src/builder/registry";
import { CardDefinition } from "../../src/base/card";
import { mergeGameConfigWithDefault } from "../../src/game";
import { TEST_DATA, getTestData } from "./common";
import { EmptyCharacter } from "./mock_def";

const ENTITY_ID_START = -1000000;
let nextId = ENTITY_ID_START;

export interface StateDescription {
  phase?: PhaseType;
  roundNumber?: number;
  currentTurn?: 0 | 1;
  myActive?: CharacterDescription | 0 | 1 | 2;
  myCharacters?: CharacterDescription[];
  myDice?: number[];
  myHands?: CardHandle[];
  myPiles?: CardHandle[];
  mySupports?: EntityDescription<"support">[];
  mySummons?: EntityDescription<"summon">[];
  myCombatStatuses?: EntityDescription<"combatStatus">[];
  oppActive?: CharacterDescription | number;
  oppCharacters?: CharacterDescription[];
  oppDice?: number[];
  oppHands?: CardHandle[];
  oppPiles?: CardHandle[];
  oppSupports?: EntityDescription<"support">[];
  oppSummons?: EntityDescription<"summon">[];
  oppCombatStatuses?: EntityDescription<"combatStatus">[];
}

function getCardDef(defId: CardHandle): CardDefinition {
  const def = getTestData().cards.get(defId);
  if (!def) {
    throw new Error(`Unknown card definition id ${defId}`);
  }
  return def;
}

function buildCard(defId: CardHandle): CardState {
  const definition = getCardDef(defId);
  return {
    id: nextId--,
    definition,
  };
}

type EntityDescription<T extends EntityType> = HandleT<T> | EntityState;

interface MockEntityOptions {
  id?: number;
  vars?: Partial<EntityVariables>;
}

function buildEntity(
  desc: EntityDescription<any>,
  opt: MockEntityOptions = {},
): EntityState {
  if (typeof desc === "object" && "definition" in desc) {
    return desc;
  }
  const definition = getTestData().entities.get(desc);
  if (!definition) {
    throw new Error(`Unknown entity definition id ${desc}`);
  }
  return {
    id: opt.id ?? nextId--,
    definition,
    variables: {
      ...definition.constants,
      ...((opt.vars ?? {}) as EntityVariables),
    },
  };
}

type CharacterDescription = CharacterHandle | CharacterState;

interface MockCharacterOptions {
  id?: number;
  vars?: Partial<CharacterVariables>;
  has?: EntityDescription<"equipment" | "status">[];
}

function buildCharacter(
  desc: CharacterDescription,
  opt: MockCharacterOptions = {},
): CharacterState {
  if (typeof desc === "object" && "definition" in desc) {
    return desc;
  }
  const definition = getTestData().characters.get(desc);
  if (!definition) {
    throw new Error(`Unknown character definition id ${desc}`);
  }
  const entities = opt.has?.map((e) => buildEntity(e)) ?? [];
  return {
    id: opt.id ?? nextId--,
    definition,
    variables: {
      ...definition.constants,
      ...((opt.vars ?? {}) as CharacterVariables),
    },
    entities,
    damageLog: [],
  };
}

export function mockState(desc: StateDescription = {}): GameState {
  const data: DataStore = Reflect.get(globalThis, TEST_DATA);
  const toCharacterState = (ch: CharacterDescription) => {
    return buildCharacter(ch);
  };
  const toEntityState = (et: EntityDescription<any>) => {
    return buildEntity(et);
  };
  const toCardState = (card: CardHandle) => {
    return buildCard(card);
  };
  const config = mergeGameConfigWithDefault({ randomSeed: 1 });

  let myCharacters: CharacterState[];
  let myActiveCharacterId: number;
  if (desc.myCharacters) {
    myCharacters = desc.myCharacters.map(toCharacterState);
    if (typeof desc.myActive === "number") {
      if (desc.myActive < myCharacters.length) {
        myActiveCharacterId = myCharacters[desc.myActive].id;
      } else {
        throw new Error(
          `use active index (0, 1, 2) instead of character description in myActive`,
        );
      }
    } else {
      myActiveCharacterId = myCharacters[0].id;
    }
  } else {
    if (typeof desc.myActive === "number" && desc.myActive < 3) {
      myCharacters = [EmptyCharacter, EmptyCharacter, EmptyCharacter].map(
        toCharacterState,
      );
      myActiveCharacterId = myCharacters[desc.myActive].id;
    } else {
      myCharacters = [
        (desc.myActive ?? EmptyCharacter) as CharacterDescription,
        EmptyCharacter,
        EmptyCharacter,
      ].map(toCharacterState);
      myActiveCharacterId = myCharacters[0].id;
    }
  }
  let oppCharacters: CharacterState[];
  let oppActiveCharacterId: number;
  if (desc.oppCharacters) {
    oppCharacters = desc.oppCharacters.map(toCharacterState);
    if (typeof desc.oppActive === "number") {
      if (desc.oppActive < oppCharacters.length) {
        oppActiveCharacterId = oppCharacters[desc.oppActive].id;
      } else {
        throw new Error(
          `use active index (0, 1, 2) instead of character description in oppActive`,
        );
      }
    } else {
      oppActiveCharacterId = oppCharacters[0].id;
    }
  } else {
    if (typeof desc.oppActive === "number" && desc.oppActive < 3) {
      oppCharacters = [EmptyCharacter, EmptyCharacter, EmptyCharacter].map(
        toCharacterState,
      );
      oppActiveCharacterId = oppCharacters[desc.oppActive].id;
    } else {
      oppCharacters = [
        (desc.oppActive ?? EmptyCharacter) as CharacterDescription,
        EmptyCharacter,
        EmptyCharacter,
      ].map(toCharacterState);
      oppActiveCharacterId = oppCharacters[0].id;
    }
  }

  return {
    config,
    data,
    phase: desc.phase ?? "action",
    roundNumber: desc.roundNumber ?? 1,
    currentTurn: desc.currentTurn ?? 0,
    players: [
      {
        activeCharacterId: myActiveCharacterId,
        characters: myCharacters,
        dice: desc.myDice ?? new Array(16).fill(DiceType.Omni),
        hands: desc.myHands?.map(toCardState) ?? [],
        piles: desc.myPiles?.map(toCardState) ?? [],
        initialPiles: desc.myPiles?.map(getCardDef) ?? [],
        supports: desc.mySupports?.map(toEntityState) ?? [],
        summons: desc.mySummons?.map(toEntityState) ?? [],
        combatStatuses: desc.myCombatStatuses?.map(toEntityState) ?? [],
        declaredEnd: false,
        hasDefeated: false,
        legendUsed: false,
        canPlunging: false,
        skipNextTurn: false,
      },
      {
        activeCharacterId: oppActiveCharacterId,
        characters: oppCharacters,
        dice: desc.oppDice ?? new Array(16).fill(DiceType.Omni),
        hands: desc.oppHands?.map(toCardState) ?? [],
        piles: desc.oppPiles?.map(toCardState) ?? [],
        initialPiles: desc.oppPiles?.map(getCardDef) ?? [],
        supports: desc.oppSupports?.map(toEntityState) ?? [],
        summons: desc.oppSummons?.map(toEntityState) ?? [],
        combatStatuses: desc.oppCombatStatuses?.map(toEntityState) ?? [],
        declaredEnd: false,
        hasDefeated: false,
        legendUsed: false,
        canPlunging: false,
        skipNextTurn: false,
      },
    ],
    iterators: {
      id: nextId,
      random: [...minstd.factory({ seed: config.randomSeed }).state],
    },
    winner: null,
    globalPlayCardLog: [],
    globalUseSkillLog: [],
    mutationLog: [],
  };
}

export function decorate<T extends EntityType>(
  handle: EntityDescription<T>,
  opt: MockEntityOptions,
): EntityState;
export function decorate(
  ch: CharacterDescription,
  opt: MockCharacterOptions,
): CharacterState;
export function decorate(id: any, opt: any): AnyState {
  if (id < 10000) {
    return buildCharacter(id, opt);
  } else {
    return buildEntity(id, opt);
  }
}
