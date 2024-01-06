import type {
  ActionRequest,
  ActionResponse,
  ChooseActiveRequest,
  ChooseActiveResponse,
  NotificationMessage,
  PlayerData,
  RerollDiceResponse,
  StateData,
  SwitchHandsResponse,
} from "@gi-tcg/typings";
import type { PlayerIO } from "@gi-tcg/core";
import { useEffect, useRef, useState } from "preact/hooks";
import type { ChessboardProps } from "./components/chessboard";

const EMPTY_PLAYER_DATA: PlayerData = {
  activeCharacterId: 0,
  dice: [],
  piles: [],
  hands: [],
  characters: [],
  combatStatuses: [],
  summons: [],
  supports: [],
  declaredEnd: false,
  legendUsed: false,
};

const EMPTY_STATE_DATA: StateData = {
  currentTurn: 0,
  phase: "initHands",
  roundNumber: 0,
  winner: null,
  players: [EMPTY_PLAYER_DATA, EMPTY_PLAYER_DATA],
};

export interface AgentActions {
  onNotify?: (msg: NotificationMessage) => void;
  onSwitchHands: () => Promise<SwitchHandsResponse>;
  onChooseActive: (req: ChooseActiveRequest) => Promise<ChooseActiveResponse>;
  onRerollDice: () => Promise<RerollDiceResponse>;
  onAction: (req: ActionRequest) => Promise<ActionResponse>;
}

export function usePlayer(who: 0 | 1): [PlayerIO, ChessboardProps] {
  const [stateData, setStateData] = useState<StateData>(EMPTY_STATE_DATA);
  const [giveUp, setGiveUp] = useState(false);
  const io = useRef<PlayerIO>(null!);
  const actionRef = useRef<AgentActions | null>(null);
  if (io.current === null) {
    io.current = {
      giveUp: false,
      notify: (msg) => {
        setStateData(msg.newState);
        if (actionRef.current && actionRef.current.onNotify) {
          actionRef.current.onNotify(msg);
        }
      },
      /* eslint-disable @typescript-eslint/no-explicit-any */
      rpc: async (method, req): Promise<any> => {
        if (actionRef.current === null) {
          throw new Error("No action handler");
        }
        switch (method) {
          case "switchHands":
            return actionRef.current.onSwitchHands();
          case "chooseActive":
            return actionRef.current.onChooseActive(req as ChooseActiveRequest);
          case "rerollDice":
            return actionRef.current.onRerollDice();
          case "action":
            return actionRef.current.onAction(req as ActionRequest);
          default:
            throw new Error("Unknown method");
        }
      },
    };
  }
  useEffect(() => {
    if (giveUp) {
      io.current.giveUp = true;
    }
  }, [giveUp]);

  return [
    io.current,
    {
      who,
      data: stateData,
      onGiveUp: () => setGiveUp(true),
      actions: actionRef,
    },
  ];
}
