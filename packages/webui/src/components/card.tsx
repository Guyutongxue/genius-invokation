import type { CardData } from "@gi-tcg/typings";
import clsx from "clsx";

import "./card.css";

import { Image } from "./image";
import { DiceCost } from "./dice_cost";

export interface CardProps {
  data: CardData;
}

export function Card({ data }: CardProps) {
  const draggable = false; // TODO
  const selected = false; // TODO
  const clickable = false; // TODO
  return (
    <div class="card-wrapper">
      {data.definitionId > 0 ? (
        <div
          class={clsx("card relative", { selected })}
          // @click="clickable && emit('click', data.id)"
          // </div>@dragstart="dragstartHandler"
          // @dragend="dragendHandler"
          draggable={draggable}
        >
          <Image
            imageId={data.definitionId}
            class={clsx("h-full rounded-lg shadow-lg", { clickable })}
            title={`id = ${data.id}`}
          />
          <DiceCost
            class="absolute left-0 top-0 translate-x-[-50%] flex flex-col"
            cost={data.definitionCost}
          />
        </div>
      ) : (
        <div class="h-full aspect-[7/12] rotated flex items-center justify-center bg-gray-600 b-gray-700 b-solid b-4 color-white rounded" />
      )}
    </div>
  );
}
