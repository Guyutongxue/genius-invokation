import { type JSX } from "preact";
import { type Signal, signal } from "@preact/signals";
import { getAssetPath } from "../config";

export interface ImageProps extends JSX.HTMLAttributes<HTMLDivElement> {
  imageId: number;
}

const allAssets = new Map<number, Signal<string | null>>();

function useImageAsset(imageId: number) {
  if (allAssets.has(imageId)) {
    return allAssets.get(imageId)!;
  }
  const newImage = signal<string | null>(null);
  allAssets.set(imageId, newImage);
  const assetUrl = getAssetPath(imageId);
  if (assetUrl !== null) {
    fetch(assetUrl)
      .then((r) => r.blob())
      .then((blob) => {
        newImage.value = URL.createObjectURL(blob);
      });
  }
  return newImage;
}

export function Image({ imageId, ...props }: ImageProps) {
  const url = useImageAsset(imageId);
  return (
    <div class={props.class}>
      {(url.value !== null && (
        <img src={url.value} alt={`id = ${imageId}`} />
      )) || (
        <div class="w-full h-full bg-gray-200 flex items-center justify-center">
          {imageId}
        </div>
      )}
    </div>
  );
}
