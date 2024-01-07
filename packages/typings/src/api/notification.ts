import type { ExposedMutation } from "./mutation";
import type { DiceType, DamageType, Aura, Reaction } from "../enums";

export type PhaseType =
  | "initHands"
  | "initActives"
  | "roll"
  | "action"
  | "end"
  | "gameEnd";

export interface CharacterData {
  id: number;
  definitionId: number;
  defeated: boolean;
  entities: EntityData[];
  health: number;
  energy: number;
  maxEnergy: number;
  aura: Aura;
}

export interface EntityData {
  id: number;
  definitionId: number;
  variable: number | null;
  hintIcon: number | null;
  hintText: string | null;
}

export interface CardData {
  id: number;
  definitionId: number;
  definitionCost: DiceType[];
}

export interface SkillData {
  definitionId: number;
  definitionCost: DiceType[];
}

export interface PlayerData {
  activeCharacterId: number | null;
  characters: CharacterData[];
  piles: CardData[];
  hands: CardData[];
  dice: DiceType[];
  combatStatuses: EntityData[];
  supports: EntityData[];
  summons: EntityData[];
  skills: SkillData[];
  declaredEnd: boolean;
  legendUsed: boolean;
}

export interface StateData {
  phase: PhaseType;
  roundNumber: number;
  currentTurn: number;
  winner: 0 | 1 | null;
  players: [PlayerData, PlayerData];
}

export interface DamageData {
  type: DamageType;
  value: number;
  target: number;
  log: string;
}
export interface DamageEvent {
  type: "damage";
  damage: DamageData;
}
export interface ElementalReactionEvent {
  type: "elementalReaction";
  on: number;
  reactionType: Reaction;
}
export interface UseCommonSkillEvent {
  type: "useCommonSkill";
  skill: number;
  who: 0 | 1;
}
export interface TriggeredEvent {
  type: "triggered";
  id: number;
}
export interface OtherEvent {
  type: "oppChoosingActive" | "oppAction"
}
export type Event =
  | DamageEvent
  | ElementalReactionEvent
  | UseCommonSkillEvent
  | TriggeredEvent
  | OtherEvent;

export type NotificationMessage = {
  events: Event[];
  mutations: ExposedMutation[];
  newState: StateData;
};
