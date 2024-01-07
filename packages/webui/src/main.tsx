import "preact/debug";
import { render } from "preact";
import { Chessboard } from "./index";
import { usePlayer } from "./player";

import data from "@gi-tcg/data";
import { GameIO, PlayerConfig, startGame } from "@gi-tcg/core";
import { useEffect, useRef } from "preact/hooks";
import { useCondVar } from "./utils";

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

function App() {
  const [io0, props0] = usePlayer(0);
  const [io1, props1] = usePlayer(1);

  const [pausing, pause, resume] = useCondVar();

  const io = useRef<GameIO>({
    pause,
    players: [io0, io1],
  });
  useEffect(() => {
    startGame({
      data,
      io: io.current,
      playerConfigs: [playerConfig0, playerConfig1],
    });
  }, []);
  
  return (
    <div class="min-w-180 flex flex-col gap-2">
      <div>
        <button disabled={!pausing} onClick={resume}>
          Step
        </button>
      </div>
      <Chessboard {...props0} />
      <Chessboard {...props1} />
    </div>
  );
}

render(<App />, document.getElementById("root")!);
