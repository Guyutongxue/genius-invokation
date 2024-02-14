import minstd from "@stdlib/random-base-minstd";
import { PhaseType } from "@gi-tcg/typings";
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
import { CardState, GameState } from "../../src";
import { DataStore } from "../../src/builder/registry";
import { CardDefinition } from "../../src/base/card";
import { mergeGameConfigWithDefault } from "../../src/game";
import { TEST_DATA, getTestData } from "./common";
import { EmptyCharacter } from "./mock_def";

export interface StateDescription {
  phase?: PhaseType;
  roundNumber?: number;
  currentTurn?: 0 | 1;
  myActive?: CharacterHandle | 0 | 1 | 2;
  myCharacters?: CharacterHandle[];
  myDice?: number[];
  myHands?: CardHandle[];
  myPiles?: CardHandle[];
  mySupports?: HandleT<"support">[];
  mySummons?: HandleT<"summon">[];
  myCombatStatuses?: HandleT<"combatStatus">[];
  oppActive?: CharacterHandle | number;
  oppCharacters?: CharacterHandle[];
  oppDice?: number[];
  oppHands?: CardHandle[];
  oppPiles?: CardHandle[];
  oppSupports?: HandleT<"support">[];
  oppSummons?: HandleT<"summon">[];
  oppCombatStatuses?: HandleT<"combatStatus">[];
}

function getCardDef(defId: CardHandle): CardDefinition {
  const def = getTestData().cards.get(defId);
  if (!def) {
    throw new Error(`Unknown card definition id ${defId}`);
  }
  return def;
}

function buildCard(idGenerator: IdGenerator, defId: CardHandle): CardState {
  const definition = getCardDef(defId);
  return {
    id: idGenerator.id--,
    definition,
  };
}

interface MockEntityState<T extends EntityType> {
  definition: HandleT<T>;
  variables: Partial<EntityVariables>;
}

type EntityDescription<T extends EntityType> = HandleT<T> | MockEntityState<T>;

function uniformEntity(
  desc: EntityDescription<any>,
  vars?: Partial<EntityVariables>,
): MockEntityState<any> {
  if (typeof desc === "object" && "definition" in desc) {
    return desc;
  }
  return {
    definition: desc,
    variables: vars ?? {},
  };
}

interface MockCharacterState {
  definition: CharacterHandle;
  variables: Partial<CharacterVariables>;
  entities: MockEntityState<"status" | "equipment">[];
}

type CharacterDescription = CharacterHandle | MockCharacterState;

interface MockCharacterOptions {
  vars: Partial<CharacterVariables>;
  has?: EntityDescription<"equipment" | "status">[];
}

function uniformCharacter(
  desc: CharacterDescription,
  opt?: MockCharacterOptions,
): MockCharacterState {
  if (typeof desc === "object" && "definition" in desc) {
    return desc;
  }
  return {
    definition: desc,
    variables: opt?.vars ?? {},
    entities: opt?.has?.map((e) => uniformEntity(e)) ?? [],
  };
}

function buildEntity(
  idGenerator: IdGenerator,
  mock: MockEntityState<EntityType>,
): EntityState {
  const definition = getTestData().entities.get(mock.definition);
  if (!definition) {
    throw new Error(`Unknown entity definition id ${mock.definition}`);
  }
  return {
    id: idGenerator.id--,
    definition,
    variables: {
      ...definition.constants,
      ...(mock.variables as EntityVariables),
    },
  };
}

function buildCharacter(
  idGenerator: IdGenerator,
  mock: MockCharacterState,
): CharacterState {
  const definition = getTestData().characters.get(mock.definition);
  if (!definition) {
    throw new Error(`Unknown character definition id ${mock.definition}`);
  }
  const entities = mock.entities.map((e) => buildEntity(idGenerator, e));
  return {
    id: idGenerator.id--,
    definition,
    variables: {
      ...definition.constants,
      ...(mock.variables as CharacterVariables),
    },
    entities,
    damageLog: [],
  };
}

interface IdGenerator {
  id: number;
}

export function mockState(desc: StateDescription = {}): GameState {
  const data: DataStore = Reflect.get(globalThis, TEST_DATA);
  const idGenerator: IdGenerator = {
    id: -700000,
  };

  const toCharacterState = (ch: CharacterDescription) => {
    return buildCharacter(idGenerator, uniformCharacter(ch));
  };
  const toEntityState = (et: EntityDescription<any>) => {
    return buildEntity(idGenerator, uniformEntity(et));
  };
  const toCardState = (card: CardHandle) => {
    return buildCard(idGenerator, card);
  };
  const config = mergeGameConfigWithDefault({ randomSeed: 1 });

  let myCharacters: CharacterState[];
  let myActiveCharacterId: number;
  if (desc.myCharacters) {
    myCharacters = desc.myCharacters.map(toCharacterState);
    if (
      typeof desc.myActive === "number" &&
      desc.myActive < myCharacters.length
    ) {
      myActiveCharacterId = myCharacters[desc.myActive].id;
    } else {
      throw new Error(
        `use active index (0, 1, 2) instead of character description in myActive`,
      );
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
    if (
      typeof desc.oppActive === "number" &&
      desc.oppActive < oppCharacters.length
    ) {
      oppActiveCharacterId = oppCharacters[desc.oppActive].id;
    } else {
      throw new Error(
        `use active index (0, 1, 2) instead of character description in oppActive`,
      );
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
        dice: desc.myDice ?? [],
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
        dice: desc.oppDice ?? [],
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
      id: idGenerator.id,
      random: [...minstd.factory({ seed: config.randomSeed }).state],
    },
    winner: null,
    globalPlayCardLog: [],
    globalUseSkillLog: [],
    mutationLog: [],
  };
}
