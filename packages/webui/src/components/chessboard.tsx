import type { StateData } from "@gi-tcg/typings";
import { MutableRef, useContext, useState } from "preact/hooks";
import { AgentActions } from "../player";
import { createContext } from "preact";

export interface ChessboardProps {
  who: 0 | 1;
  data: StateData;
  actions: MutableRef<AgentActions | null>;
  onGiveUp: () => void;
  agent?: AgentActions;
}

export interface PlayerContextValue {
  allClickable: number[];
  allSelected: number[];
  onClick: (id: number) => void;
}

export const PlayerContext = createContext<PlayerContextValue>(null!);
export function usePlayerContext() {
  return useContext(PlayerContext);
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
      },
    };
  }
  const [allClickable, setClickable] = useState<number[]>([]);
  const [allSelected, setSelected] = useState<number[]>([]);
  const onClick = (id: number) => {
    // if (clickable.includes(id)) {
    //   setSelected([id]);
    // }
    // TODO
  };
  return (
    <div class="gi-tcg-chessboard">
      <PlayerContext.Provider
        value={{
          allClickable,
          allSelected,
          onClick,
        }}
      >
        <output>{JSON.stringify(data)}</output>
      </PlayerContext.Provider>
    </div>
  );
}
