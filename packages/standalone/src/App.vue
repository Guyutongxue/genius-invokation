<script setup lang="ts">
import { onMounted, ref } from "vue";

import {
  startGame,
  PlayerIO,
  StateData,
  RpcMethod,
  RpcRequest,
  RpcResponse,
PlayerConfig,
} from "@gi-tcg/core";
import data from "@gi-tcg/data";
import Chessboard from "./components/Chessboard.vue";
import { Player } from "./player";
import { mittWithOnce } from "./util";

const state0 = ref<StateData>();
const state1 = ref<StateData>();

async function doRpc<M extends RpcMethod>(
  m: M,
  req: RpcRequest[M],
  who: 0 | 1,
): Promise<RpcResponse[RpcMethod]> {
  switch (m) {
    case "chooseActive":
      const { candidates } = req as RpcRequest["chooseActive"];
      return {
        active: candidates[0],
      } as RpcResponse["chooseActive"];
    case "rerollDice":
      return {
        rerollIndexes: [],
      } as RpcResponse["rerollDice"];
    default:
      throw new Error("Not implemented");
  }
}

async function rpc<M extends RpcMethod>(
  m: M,
  req: RpcRequest[M],
  who: 0 | 1,
): Promise<RpcResponse[M]> {
  const res = await doRpc(m, req, who);
  console.log("RPC", m, req, who, res);
  return res as any;
}

const player0Io: PlayerIO = {
  giveUp: false,
  notify: ({ newState, events, mutations }) => {
    console.log(mutations);
    state0.value = newState;
  },
  rpc: (m, r) => rpc(m, r, 0),
};

const player1Io: PlayerIO = {
  giveUp: false,
  notify: ({ newState }) => {
    state1.value = newState;
  },
  rpc: (m, r) => rpc(m, r, 1),
};

const playerConfig0: PlayerConfig = {
  characters: [1303, 1201, 1502],
  cards: [
    332015, 332009, 332002, 331602, 331302, 331402, 331502, 331102, 331202,
    331702, 331301, 331101, 331601, 331401, 331201, 331701, 331501, 332016,
    332020, 332014, 332004, 332018, 332005, 332006, 332024, 332010, 331804,
    332023, 332017, 332012, 332021, 332013, 332008, 331802, 332004, 332001,
    332019, 331803, 332003, 332007, 332022, 331801, 332011,
  ],
  noShuffle: import.meta.env.DEV,
  alwaysOmni: import.meta.env.DEV,
};
const playerConfig1: PlayerConfig = {
  characters: [1502, 1201, 1303],
  cards: [
    332015, 332009, 332002, 331602, 331302, 331402, 331502, 331102, 331202,
    331702, 331301, 331101, 331601, 331401, 331201, 331701, 331501, 332016,
    332020, 332014, 332004, 332018, 332005, 332006, 332024, 332010, 331804,
    332023, 332017, 332012, 332021, 332013, 332008, 331802, 332004, 332001,
    332019, 331803, 332003, 332007, 332022, 331801, 332011,
  ],
  noShuffle: import.meta.env.DEV,
  alwaysOmni: import.meta.env.DEV,
};
const player0 = new Player(playerConfig0, 0);
const player1 = new Player(playerConfig1, 1);

onMounted(async () => {
  const winner = await startGame({
    data,
    io: {
      pause: async () => {
        enableStep.value = true;
        await new Promise<void>((resolve) => {
          emitter.once("step", resolve);
        });
        enableStep.value = false;
      },
      players: [player0.io, player1.io],
    },
    playerConfigs: [playerConfig0, playerConfig1],
  });
  console.log("Winner is", winner);
});

const emitter = mittWithOnce<{
  step: void;
}>();
const enableStep = ref(false);
</script>

<template>
  <div class="min-w-180 flex flex-col gap-2">
    <div>
      <button :disabled="!enableStep" @click="emitter.emit('step')">
        Step
      </button>
    </div>
    <Chessboard :player="player0"></Chessboard>
    <Chessboard :player="player1"></Chessboard>
  </div>
</template>
