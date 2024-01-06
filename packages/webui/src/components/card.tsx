import type { CardData } from "@gi-tcg/typings";

export interface CardProps {
  data: CardData;
}

export function Card({ data }: CardProps) {
  return <div></div>;
}
