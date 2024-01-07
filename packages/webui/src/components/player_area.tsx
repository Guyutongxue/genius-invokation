import type { PlayerData } from "@gi-tcg/typings";
import { usePlayerContext } from "./chessboard";
import { Support, Summon, Status } from "./entity.tsx";
import { CharacterArea } from "./character_area.tsx";
import { Card } from "./card.tsx";

export interface PlayerAreaProps {
  data: PlayerData;
  opp: boolean;
}

export function PlayerArea({ data, opp }: PlayerAreaProps) {
  return (
    <div class="w-full flex flex-row">
      <div class="bg-yellow-800 text-white flex items-center w-10 flex-shrink-0">
        piles = {data.piles.length}
      </div>
      <div
        class={`flex-grow flex gap-6 ${opp ? "flex-col-reverse" : "flex-col"}`}
      >
        <div class="h-52 flex flex-row justify-center gap-6">
          <div class="min-w-40">
            {data.supports.map((support) => (
              <Support key={support.id} data={support} />
            ))}
          </div>
          <div class="flex flex-row gap-6 items-end">
            {data.characters.map((ch) => {
              return (
                <div class="flex flex-col" key={ch.id}>
                  <CharacterArea data={ch} />
                  {ch.id === data.activeCharacterId ? (
                    <div class="h-6 flex flex-row">
                      {data.combatStatuses.map((st) => (
                        <Status key={st.id} data={st} />
                      ))}
                    </div>
                  ) : (
                    opp && <div class="h-12" />
                  )}
                </div>
              );
            })}
          </div>
          <div class="min-w-40">
            {data.summons.map((summon) => (
              <Summon key={summon.id} data={summon} />
            ))}
          </div>
        </div>
        <div
          class={`h-30 flex flex-row mx-4 hands-area ${
            opp ? "justify-end" : "justify-start"
          }`}
        >
          {data.hands.map((card) => {
            return (
              <Card
                key={card.id}
                data={card}
                // onDragstart={onDragstart}
                // onDragend={ondragend}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
