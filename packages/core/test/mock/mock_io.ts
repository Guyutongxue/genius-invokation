import {
  Action,
  DiceType,
  PlayCardAction,
  RpcMethod,
  RpcRequest,
  RpcResponse,
  SwitchActiveAction,
  UseSkillAction,
} from "@gi-tcg/typings";
import { PlayerIO } from "../../src/io";
import { CardHandle, SkillHandle } from "../../src/builder";

type TargetSpec = "" | ` ${number}` | ` ${number} ${number}`;

export type ActionResponseStr =
  | `useSkill ${SkillHandle}`
  | `playCard ${CardHandle}${TargetSpec}`
  | `switchActive ${number}`;

export class MockPlayerIO implements PlayerIO {
  readonly giveUp = false as const;

  actionQueue: ActionResponseStr[] = [];

  notify() {}

  private action({ candidates }: RpcRequest["action"]): RpcResponse["action"] {
    const declareEndIndex = candidates.findIndex(
      (c) => c.type === "declareEnd",
    );
    const response = this.actionQueue.shift();
    if (response === undefined) {
      return {
        chosenIndex: declareEndIndex,
        cost: [],
      };
    }
    if (response.startsWith("useSkill")) {
      const skillNo = Number(response.split(" ")[1]);
      const index = candidates.findIndex(
        (c) => c.type === "useSkill" && c.skill === skillNo,
      );
      if (index === -1) {
        this.throwInvalidResponseError(candidates, response);
      }
      const action = candidates[index] as UseSkillAction;
      return {
        chosenIndex: index,
        cost: repeat(
          DiceType.Omni,
          action.cost.filter((d) => d !== DiceType.Energy).length,
        ),
      };
    }
    if (response.startsWith("playCard")) {
      const [, card, ...targetStr] = response.split(" ");
      const targets = targetStr.map(Number);
      const index = candidates.findIndex(
        (c) =>
          c.type === "playCard" &&
          c.card === Number(card) &&
          sameArray(c.targets, targets),
      );
      if (index === -1) {
        this.throwInvalidResponseError(candidates, response);
      }
      const action = candidates[index] as PlayCardAction;
      return {
        chosenIndex: index,
        cost: repeat(
          DiceType.Omni,
          action.cost.filter((d) => d !== DiceType.Energy).length,
        ),
      };
    }
    if (response.startsWith("switchActive")) {
      const switchTarget = Number(response.split(" ")[1]);
      const index = candidates.findIndex(
        (c) => c.type === "switchActive" && c.active === switchTarget,
      );
      if (index === -1) {
        this.throwInvalidResponseError(candidates, response);
      }
      const action = candidates[index] as SwitchActiveAction;
      return {
        chosenIndex: index,
        cost: repeat(
          DiceType.Omni,
          action.cost.filter((d) => d !== DiceType.Energy).length,
        ),
      };
    }
    this.throwInvalidResponseError(candidates, response);
  }

  private throwInvalidResponseError(
    candidates: readonly Action[],
    response: ActionResponseStr,
  ): never {
    throw new Error(
      `"${response}" is not provided in action candidates; available actions are:\n${JSON.stringify(
        candidates,
        void 0,
        2,
      )}`,
    );
  }

  async rpc<M extends RpcMethod>(method: M, data: RpcRequest[M]): Promise<any> {
    if (method === "rerollDice") {
      return { rerollIndexes: [] } as RpcResponse["rerollDice"];
    }
    if (method === "switchHands") {
      return { removedHands: [] } as RpcResponse["switchHands"];
    }
    if (method === "chooseActive") {
      const { candidates } = data as RpcRequest["chooseActive"];
      return { active: candidates[0] } as RpcResponse["chooseActive"];
    }
    return this.action(data as RpcRequest["action"]);
  }
}

function repeat<T>(value: T, count: number): T[] {
  return new Array(count).fill(value);
}

function sameArray<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
