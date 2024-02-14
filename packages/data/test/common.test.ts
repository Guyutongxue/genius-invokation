import { test, describe, expect } from "bun:test";
import { EmptyCharacter, GameTester, decorate } from "@gi-tcg/core/mock";
import { Barbara, LetTheShowBegin, MelodyLoop, ShiningMiracle, WhisperOfWater } from "../src/characters/hydro/barbara";
import { Aura } from "@gi-tcg/core/builder";

describe("barbara", () => {

  test("normal", async () => {
    const tester = new GameTester({
      myActive: Barbara
    });
    tester.setMyActions(`useSkill ${WhisperOfWater}`);
    await tester.runUntilMyActionDone();
    expect(tester.$("my active")!.variables.energy).toBe(1);
    expect(tester.$("opp active")!.variables.health).toBe(9);
    expect(tester.$("opp active")!.variables.aura).toBe(Aura.Hydro);
  });

  test("elemental", async () => {
    const tester = new GameTester({
      myActive: Barbara
    });
    tester.setMyActions(`useSkill ${LetTheShowBegin}`);
    await tester.runUntilMyActionDone();
    expect(tester.$("my active")!.variables.energy).toBe(1);
    expect(tester.$("opp active")!.variables.health).toBe(9);
    expect(tester.$("opp active")!.variables.aura).toBe(Aura.Hydro);
    expect(tester.$("my summon")?.definition.id).toBe(MelodyLoop);
  });

  test("burst", async () => {
    const tester = new GameTester({
      myCharacters: [
        decorate(Barbara, { vars: { energy: 3, health: 1 }}),
        decorate(EmptyCharacter, { vars: { health: 1 } }),
        decorate(EmptyCharacter, { vars: { health: 1 } }),
      ]
    });
    tester.setMyActions(`useSkill ${ShiningMiracle}`);
    await tester.runUntilMyActionDone();
    expect(tester.$("my active")!.variables.health).toBe(5);
    expect(tester.$("my next")!.variables.health).toBe(5);
    expect(tester.$("my prev")!.variables.health).toBe(5);
  })
});

