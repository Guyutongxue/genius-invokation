import { CharacterData } from "@gi-tcg/typings";
import { Image } from "./image";
import { Status } from "./entity";
import { usePlayerContext } from "./chessboard";

export interface CharacterAreaProps {
  data: CharacterData;
}

interface EnergyBarProps {
  current: number;
  total: number;
}

function EnergyBar({ current, total }: EnergyBarProps) {
  return (
    <div class="absolute z-10 right-[-10px] top-0 flex flex-col gap-2">
      {
        Array(total)
          .fill(0)
          .map((_, i) => (
            <svg // 能量点
              key={`${i}`}
              v-for="i of total"
              viewBox="0 0 1024 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
            >
              <path
                d="M538.112 38.4c-15.36-44.544-39.936-44.544-55.296 0l-84.992 250.88c-14.848 44.544-64 93.184-108.032 108.544L40.448 482.816c-44.544 15.36-44.544 39.936 0 55.296l247.808 86.016c44.544 15.36 93.184 64.512 108.544 108.544l86.528 251.392c15.36 44.544 39.936 44.544 55.296 0l84.48-249.856c14.848-44.544 63.488-93.184 108.032-108.544l252.928-86.528c44.544-15.36 44.544-39.936 0-54.784l-248.832-83.968c-44.544-14.848-93.184-63.488-108.544-108.032-1.536-0.512-88.576-253.952-88.576-253.952z"
                fill={i < current ? "yellow" : "white"}
                stroke="black"
                stroke-width="40"
              />
            </svg>
          ))
      }
    </div>
  );
}

export function CharacterArea({ data }: CharacterAreaProps) {
  const { allSelected, allClickable, onClick } = usePlayerContext();
  const selected = allSelected.includes(data.id);
  const clickable = allClickable.includes(data.id);
  return (
    <div class="flex flex-col gap-1 items-center">
      <div class="h-5 flex flex-row items-end gap-2">
        {data.aura & 0xf && <Image imageId={data.aura & 0xf} class="w-5" />}
        {(data.aura >> 4) & 0xf && (
          <Image imageId={(data.aura >> 4) & 0xf} class="w-5" />
        )}
      </div>
      <div
        class={`h-40 relative ${selected ? "selected" : ""}`}
        title={`id=${data.id}`}
      >
        <div class="absolute z-10 left-[-15px] top-[-20px] flex items-center justify-center">
          <svg // 水滴
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="40"
          >
            <path
              d="M926.2 609.8c0 227.2-187 414.2-414.2 414.2S97.8 837 97.8 609.8c0-226.2 173.3-395 295.7-552C423.5 19.3 467.8 0 512 0s88.5 19.3 118.5 57.8c122.4 157 295.7 325.8 295.7 552z"
              fill="#ffffff"
              stroke="black"
              stroke-width="30"
            />
          </svg>
          <div class="absolute">{data.health}</div>
        </div>
        <EnergyBar
          current={data.energy}
          total={maxEnergyData[data.definitionId]}
        />
        <Image
          imageId={data.definitionId}
          class={`h-full rounded-lg ${data.defeated ? "brightness-50" : ""} ${
            clickable ? "clickable" : ""
          }`}
          onClick={() => clickable && onClick(data.id)}
        />
        <div class="absolute left-0 bottom-0 h-6 flex flex-row">
          {data.entities.map((st) => (
            <Status key={st.id} data={st} />
          ))}
        </div>
        <div
          v-if="data.defeated"
          class="absolute z-10 top-[50%] left-0 w-full text-center text-5xl font-bold translate-y-[-50%] font-[var(--font-emoji)]"
        >
          &#9760;
        </div>
      </div>
    </div>
  );
}
