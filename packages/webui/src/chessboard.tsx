import type { StateData } from "@gi-tcg/typings";
import { MutableRef, useState } from "preact/hooks";
import { AgentActions } from "./player";

export interface ChessboardProps {
  who: 0 | 1;
  data: StateData;
  actions: MutableRef<AgentActions | null>;
  onGiveUp: () => void;
  agent?: AgentActions;
}

export function Chessboard({ who, data, actions, agent }: ChessboardProps) {
  if (agent) {
    actions.current = agent;
  } else if (actions.current === null) {
    actions.current = {
      onNotify: () => {},
      onSwitchHands: async () => {
        return { removedHands: [] };
      },
      onRerollDice: async () => {
        return { rerollIndexes: [] };
      },
      onChooseActive: async ({ candidates }) => {
        return { active: candidates[0] };
      },
      onAction: async () => {
        throw new Error("Not implemented");
      }
    };
  }
  return (
    <div class="gi-tcg-chessboard">
      <output>{ JSON.stringify(data) }</output>
    </div>
  );
}
