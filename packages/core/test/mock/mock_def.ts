import { CardTag, CardType, SupportTag, WeaponCardTag } from "../../src/base/card";
import { CharacterTag, ElementTag } from "../../src/base/character";
import { CommonSkillType } from "../../src/base/skill";
import { CardHandle, DamageType, SkillHandle, SummonHandle, SupportHandle, card, character, skill, summon } from "../../src/builder";
import {
  DataStore,
  beginRegistrationTo,
  endRegistration,
} from "../../src/builder/registry";
import { TEST_DATA, getTestData } from "./common";

const MOCK_SKILL_ID_START = 70000;
const MOCK_CHARACTER_ID_START = 7000;
const MOCK_CARD_ID_START = 370000;
const MOCK_ENTITY_ID_START = 170000;

let nextSkillId = MOCK_SKILL_ID_START;
let nextCharacterId = MOCK_CHARACTER_ID_START;
let nextCardId = MOCK_CARD_ID_START;
let nextEntityId = MOCK_ENTITY_ID_START;

interface MockCharacterDefinitionOption {
  tags?: CharacterTag[];
  skills?: SkillHandle[];
}

function mockCharacter(defOpt?: MockCharacterDefinitionOption) {
  const data = getTestData();
  const tags = defOpt?.tags ?? [];
  if (
    !tags.find((t) =>
      ["cryo", "hydro", "pyro", "electro", "anemo", "geo", "dendro"].includes(
        t,
      ),
    )
  ) {
    tags.push("cryo");
  }
  const skills = defOpt?.skills ?? [];
  if (!skills.find((sk) => data.skills.get(sk)?.skillType !== "normal")) {
    skills.push(EmptySkill);
  }
  beginRegistrationTo(data);
  const result = character(nextCharacterId++)
    .tags(...tags)
    .skills(...skills)
    .done();
  endRegistration();
  return result;
}

interface MockSkillDefinitionOption {
  type?: CommonSkillType;
  damageType?: DamageType;
  damageValue?: number;
}

function mockSkill(defOpt?: MockSkillDefinitionOption) {
  beginRegistrationTo(getTestData());
  const builder = skill(nextSkillId++).type(defOpt?.type ?? "normal");
  if (defOpt?.damageType || defOpt?.damageValue) {
    builder.damage(
      defOpt.damageType ?? DamageType.Physical,
      defOpt.damageValue ?? 1,
    );
  }
  const result = builder.done();
  endRegistration();
  return result;
}

interface MockCardDefinitionOption {
  type?: "event" | "food" | WeaponCardTag | "artifact" | SupportTag;
  talent?: boolean;
}

function mockCard(defOpt?: MockCardDefinitionOption) {
  beginRegistrationTo(getTestData());
  const builder = card(nextCardId++);
  if (defOpt?.talent) {
    builder.tags("talent");
  }
  let result: CardHandle;
  const type = defOpt?.type ?? "event";
  if (["bow", "catalyst", "claymore", "pole", "sword"].includes(type)) {
    result = builder.weapon(type as WeaponCardTag).done() as CardHandle;
  } else if (type === "artifact") {
    result = builder.artifact().done() as CardHandle;
  } else if (type === "food") {
    result = builder.food().done();
  } else if (["ally", "item", "place"].includes(type)){
    result = builder.support(type as SupportTag).done() as CardHandle;
  } else {
    result = builder.done();
  }
  endRegistration();
  return result;
}

interface MockEntityDefinitionOption {
  usage?: number;
}

function mockSummon(defOpt?: MockEntityDefinitionOption) {
  beginRegistrationTo(getTestData());
  const builder = summon(nextEntityId++);
  let result: SummonHandle;
  if (defOpt?.usage) {
    result = builder.on("endPhase").usage(defOpt?.usage ?? Infinity).done();
  } else {
    result = builder.done();
  }
  endRegistration();
  return result;
}

export const EmptySkill = mockSkill();
export const EmptyCharacter = mockCharacter();
export const EmptyCard = mockCard();
export const EmptySummon = mockSummon();
export const EmptyAlly = mockCard({ type: "ally" }) as SupportHandle;
export const EmptyItem = mockCard({ type: "item" }) as SupportHandle;
export const EmptyPlace = mockCard({ type: "place" }) as SupportHandle;
