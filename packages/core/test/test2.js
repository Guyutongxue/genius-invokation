import { setup, my, opp, _, $, expect } from "../what";
import { Keqing, PlungingStrike, Icicle, Frozen } from "../blah";

const target = ref();
const death = ref();
const next = ref();
const plungingStrike = ref(PlungingStrike);

setup({
  myHands: [plungingStrike],
  myCharacters: [_, [target, { aura: hydro }], _],
  myCombatStatuses: [[Icicle, { usage: 2}]],
  oppCharacters: [[death, { health: 1 }], next, _],
  oppCombatStatuses: [Icicle]
});

my.playCard(plungingStrike, { target });
expect(death.alive).toBe(0);
opp.chooseActive(next);
expect($(`my status with definition id ${Frozen} at character with id ${target.id}`)).toBeDefined();
expect(next.health).toBe(10);
