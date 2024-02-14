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

interface StateDescription {
  phase?: PhaseType;
  roundNumber?: number;
  currentTurn?: 0 | 1;
  myActive?: CharacterDescription | 0 | 1 | 2;
  myCharacters?: CharacterDescription[];
  myDice?: number[];
  myHands?: CardDescription[];
  myPiles?: CardDescription[];
  mySupports?: EntityDescription<"support">[];
  mySummons?: EntityDescription<"summon">[];
  myCombatStatuses?: EntityDescription<"combatStatus">[];
  oppActive?: CharacterDescription | number;
  oppCharacters?: CharacterDescription[];
  oppDice?: number[];
  oppHands?: CardDescription[];
  oppPiles?: CardDescription[];
  oppSupports?: EntityDescription<"support">[];
  oppSummons?: EntityDescription<"summon">[];
  oppCombatStatuses?: EntityDescription<"combatStatus">[];
}

type CardDescription = CardHandle | { foo: "baz" };

function buildCardDefinition(
  data: DataStore,
  desc: CardDescription,
): CardDefinition {
  if (typeof desc === "number") {
    const def = data.cards.get(desc);
    if (!def) {
      throw new Error(`Unknown card definition id ${desc}`);
    }
    return def;
  }
  throw "unimplemented";
}

function buildCard(
  idGenerator: IdGenerator,
  data: DataStore,
  desc: CardDescription,
): CardState {
  const definition = buildCardDefinition(data, desc);
  return {
    id: idGenerator.id--,
    definition,
  };
}

type MockEntityDefinition<T extends EntityType> = HandleT<T>;

interface MockEntityState<T extends EntityType> {
  definition: MockEntityDefinition<T>;
  variables: Partial<EntityVariables>;
}

type EntityDescription<T extends EntityType> =
  | MockEntityDefinition<T>
  | MockEntityState<T>;

function mockEntity<T extends EntityType>(
  def: MockEntityDefinition<T>,
  vars?: Partial<EntityVariables>,
): MockEntityState<T> {
  return {
    definition: def,
    variables: vars ?? {},
  };
}

function translateEntityDescription(
  desc: EntityDescription<any>,
): MockEntityState<any> {
  if (typeof desc === "object" && "definition" in desc) {
    return desc;
  }
  return mockEntity(desc);
}

type MockCharacterDefinition = CharacterHandle | { foo: "bar" };

interface MockCharacterState {
  definition: MockCharacterDefinition;
  variables: Partial<CharacterVariables>;
  entities: MockEntityState<"status" | "equipment">[];
}

type CharacterDescription = MockCharacterDefinition | MockCharacterState;

interface MockCharacterOptions {
  vars: Partial<CharacterVariables>;
  has?: EntityDescription<"equipment" | "status">[];
}

function mockCharacter(
  def: MockCharacterDefinition,
  opt?: MockCharacterOptions,
): MockCharacterState {
  return {
    definition: def,
    variables: opt?.vars ?? {},
    entities: opt?.has?.map(translateEntityDescription) ?? [],
  };
}

function translateCharacterDescription(
  desc: CharacterDescription,
): MockCharacterState {
  if (typeof desc === "object" && "definition" in desc) {
    return desc;
  }
  return mockCharacter(desc);
}

function buildEntity(
  idGenerator: IdGenerator,
  data: DataStore,
  mock: MockEntityState<EntityType>,
): EntityState {
  const definition = data.entities.get(mock.definition);
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
  data: DataStore,
  mock: MockCharacterState,
): CharacterState {
  let definition: CharacterDefinition;
  if (typeof mock.definition === "number") {
    const def = data.characters.get(mock.definition);
    if (!def) {
      throw new Error(`Unknown character definition id ${mock.definition}`);
    }
    definition = def;
  } else {
    throw "unimplemented";
  }
  const entities = mock.entities.map((e) => buildEntity(idGenerator, data, e));
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

export function mockState(desc: StateDescription): GameState {
  const data: DataStore = {
    characters: new Map(),
    entities: new Map(),
    skills: new Map(),
    cards: new Map(),
    passiveSkills: new Map(),
  };
  const idGenerator: IdGenerator = {
    id: -700000,
  };

  const toCharacterState = (ch: CharacterDescription) => {
    return buildCharacter(idGenerator, data, translateCharacterDescription(ch));
  };
  const toEntityState = (et: EntityDescription<any>) => {
    return buildEntity(idGenerator, data, translateEntityDescription(et));
  };
  const toCardState = (card: CardDescription) => {
    return buildCard(idGenerator, data, card);
  };
  const toCardDefinition = (card: CardDescription) => {
    return buildCardDefinition(data, card);
  };
  const config = mergeGameConfigWithDefault({ randomSeed: 0 });
  return {
    config,
    data,
    phase: desc.phase ?? "action",
    roundNumber: desc.roundNumber ?? 1,
    currentTurn: desc.currentTurn ?? 0,
    players: [
      {
        activeCharacterId:
          desc.myActive === 0 || desc.myActive === 1 ? desc.myActive : 0,
        characters: desc.myCharacters?.map(toCharacterState) ?? [],
        dice: desc.myDice ?? [],
        hands: desc.myHands?.map(toCardState) ?? [],
        piles: desc.myPiles?.map(toCardState) ?? [],
        initialPiles: desc.myPiles?.map(toCardDefinition) ?? [],
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
        activeCharacterId:
          desc.oppActive === 0 || desc.oppActive === 1 ? desc.oppActive : 0,
        characters: desc.oppCharacters?.map(toCharacterState) ?? [],
        dice: desc.oppDice ?? [],
        hands: desc.oppHands?.map(toCardState) ?? [],
        piles: desc.oppPiles?.map(toCardState) ?? [],
        initialPiles: desc.oppPiles?.map(toCardDefinition) ?? [],
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
