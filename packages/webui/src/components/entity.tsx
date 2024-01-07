import type { EntityData } from "@gi-tcg/typings";

export interface EntityProps {
  data: EntityData;
}

export function Summon({ data }: EntityProps) {
  return <div></div>;
}

export { Summon as Support };

export function Status({ data }: EntityProps) {
  return <div></div>;
}
