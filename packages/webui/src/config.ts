import _assetMap from "./asset_map.json"; // with { type: "json" };

const assetMap: Record<number, string> = _assetMap;

export const DEFAULT_ASSET_PREFIX =
  "//gi-tcg-assets.guyutongxue.site/thumbnails/";
export const DEFAULT_ASSET_POSTFIX = ".webp";

let assetPrefix = DEFAULT_ASSET_PREFIX;
let assetPostfix = DEFAULT_ASSET_POSTFIX;

export function getAssetPath(id: number): string | null {
  const path = assetMap[id];
  if (path) {
    return `${assetPrefix}${path}${assetPostfix}`;
  }
  return null;
}

export function setAssetPrefix(prefix: string) {
  assetPrefix = prefix;
}
export function setAssetPostfix(postfix: string) {
  assetPostfix = postfix;
}
