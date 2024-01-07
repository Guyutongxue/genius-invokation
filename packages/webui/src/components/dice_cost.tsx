import type { DiceType } from "@gi-tcg/typings";
import { JSX } from "preact";
import { useMemo } from "preact/hooks";
import { Dice } from "./dice";

interface DiceCostProps extends JSX.HTMLAttributes<HTMLDivElement> {
  cost: DiceType[];
  realCost?: DiceType[];
}

function diceToMap(dice: readonly DiceType[]): Map<DiceType, number> {
  const result = new Map<DiceType, number>();
  for (const d of dice) {
    result.set(d, (result.get(d) ?? 0) + 1);
  }
  return result;
}

export function DiceCost({ cost, realCost = cost, ...props }: DiceCostProps) {
  const diceMap = useMemo(() => [...diceToMap(cost).entries()], [cost]);
  return (
    <div {...props}>
      {diceMap.map(([type, count], i) => (
        <Dice key={i} type={type} text={`${count}`} size={30} />
      ))}
    </div>
  );
}
