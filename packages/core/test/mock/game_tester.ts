import { AnyState, GameState } from "../../src/base/state";
import { Game, PlayerConfig } from "../../src/game";
import { MockPlayerIO } from "./mock_io";
import { StateDescription, mockState } from "./mock_state";

export class GameTester {

  game: Game | null = null;
  state: GameState | null = null;

  playerIO: readonly [MockPlayerIO, MockPlayerIO] = [
    new MockPlayerIO(),
    new MockPlayerIO(),
  ]

  constructor() {
  }

  setState(state: StateDescription) {
    this.state = mockState(state);
  }

  private async pause() {
    return new Promise(() => {});
  }

  query(query: string): AnyState[] {
    return this.game?.query(0, query) ?? [];
  } 

  start() {
    const emptyPlayerConfig: PlayerConfig = {
      cards: [],
      characters: []
    };
    if (this.state === null) {
      this.state = mockState();
    }
    this.game = new Game({
      data: this.state.data,
      io: {
        pause: () => this.pause(),
        players: this.playerIO,
      },
      playerConfigs: [emptyPlayerConfig, emptyPlayerConfig]
    });
    this.game.startFromState(this.state);
  }

}
