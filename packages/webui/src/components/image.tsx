import { type JSX } from "preact";
import { type Signal, signal } from "@preact/signals";
import { getAssetPath } from "../config";
import { useMemo } from "preact/hooks";

export interface ImageProps extends JSX.HTMLAttributes<HTMLDivElement> {
  imageId: number;
}

const allAssets = new Map<number, Signal<string | null>>();

function tryFetch(url: string, target: Signal<string | null>) {
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => {
      target.value = URL.createObjectURL(blob);
    })
    .catch(() => setTimeout(() => tryFetch(url, target), 1000));
}

function useImageAsset(imageId: number) {
  return useMemo(() => {
    if (allAssets.has(imageId)) {
      return allAssets.get(imageId)!;
    }
    const newImage = signal<string | null>(null);
    allAssets.set(imageId, newImage);
    const assetUrl = getAssetPath(imageId);
    if (assetUrl !== null) {
      tryFetch(assetUrl, newImage);
    }
    return newImage;
  }, [imageId]);
}

export function Image({ imageId, ...props }: ImageProps) {
  const url = useImageAsset(imageId);
  return (
    <div {...props}>
      {url.value !== null ? (
        <img src={url.value} alt={`id = ${imageId}`} draggable={false} />
      ) : (
        <div class="w-full h-full bg-gray-200 flex items-center justify-center">
          {imageId}
        </div>
      )}
    </div>
  );
}
