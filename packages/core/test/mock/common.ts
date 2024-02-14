import { DataStore, ReadonlyDataStore } from "../../src/builder/registry";

export const TEST_DATA: unique symbol = Symbol("test data");

export function getTestData(): DataStore {
  return Reflect.get(globalThis, TEST_DATA);
}

Reflect.set(globalThis, TEST_DATA, {
  cards: new Map(),
  characters: new Map(),
  entities: new Map(),
  skills: new Map(),
  passiveSkills: new Map(),
});

export function extendTestData(ext: ReadonlyDataStore): void {
  const data = getTestData();
  for (const key in ext) {
    const typeKey = key as keyof DataStore;
    const map = data[typeKey];
    for (const [k, v] of ext[typeKey].entries()) {
      map.set(k, v as any);
    }
  }
}
