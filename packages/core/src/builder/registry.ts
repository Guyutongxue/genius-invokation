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

import { Immutable } from "immer";
import { CardDefinition } from "../base/card";
import { CharacterDefinition } from "../base/character";
import { EntityDefinition, VariableConfig } from "../base/entity";
import {
  InitiativeSkillDefinition,
  SkillDefinition,
  TriggeredSkillDefinition,
} from "../base/skill";
import { GiTcgDataError } from "../error";
import { isCharacterInitiativeSkill } from "../utils";

let currentStore: DataStore | null = null;

export function beginRegistration() {
  beginRegistrationTo({
    characters: new Map(),
    entities: new Map(),
    skills: new Map(),
    cards: new Map(),
    passiveSkills: new Map(),
  });
}

export function beginRegistrationTo(store: DataStore) {
  if (currentStore !== null) {
    throw new GiTcgDataError("Already in registration");
  }
  currentStore = store;
}

interface PassiveSkillDefinition {
  id: number;
  type: "passiveSkill";
  varConfigs: Record<string, VariableConfig>;
  skills: readonly TriggeredSkillDefinition[];
}

type DefinitionMap = {
  characters: CharacterDefinition;
  entities: EntityDefinition;
  skills: SkillDefinition;
  cards: CardDefinition;
  passiveSkills: PassiveSkillDefinition;
};

type RegisterCategory = keyof DefinitionMap;

export type DataStore = {
  [K in RegisterCategory]: Map<number, DefinitionMap[K]>;
};
export type ReadonlyDataStore = Immutable<DataStore>;

function getCurrentStore(): DataStore {
  if (currentStore === null) {
    throw new GiTcgDataError("Not in registration");
  }
  return currentStore;
}

function register<C extends RegisterCategory>(
  type: C,
  value: DefinitionMap[C],
) {
  const store = getCurrentStore()[type];
  if (store.has(value.id)) {
    throw new GiTcgDataError(`Duplicate ${type} id ${value.id}`);
  }
  store.set(value.id, value);
}
export function registerCharacter(value: CharacterDefinition) {
  register("characters", value);
}
export function registerEntity(value: EntityDefinition) {
  register("entities", value);
}
export function registerSkill(value: SkillDefinition) {
  register("skills", value);
}
export function registerPassiveSkill(value: PassiveSkillDefinition) {
  register("passiveSkills", value);
}
export function registerCard(value: CardDefinition) {
  register("cards", value);
}

function getDefinition<C extends RegisterCategory>(
  type: C,
  id: number,
): DefinitionMap[C] {
  const store = getCurrentStore();
  const result = store[type].get(id);
  if (typeof result === "undefined") {
    throw new GiTcgDataError(`Unknown ${type} id ${id}`);
  }
  return result as DefinitionMap[C];
}
export function getCharacterDefinition(id: number) {
  return getDefinition("characters", id);
}
export function getEntityDefinition(id: number) {
  return getDefinition("entities", id);
}
export function getSkillDefinition(id: number) {
  return getDefinition("skills", id);
}
export function getCardDefinition(id: number) {
  return getDefinition("cards", id);
}

export function getCharacterSkillDefinition(
  id: number,
): InitiativeSkillDefinition<any> | PassiveSkillDefinition {
  try {
    const def = getSkillDefinition(id);
    if (!isCharacterInitiativeSkill(def)) {
      throw new GiTcgDataError("Skill found but not a character skill");
    }
    return def;
  } catch {}
  const def = getDefinition("passiveSkills", id);
  return def;
}

export function endRegistration(): ReadonlyDataStore {
  const result = getCurrentStore();
  currentStore = null;
  return result;
}
