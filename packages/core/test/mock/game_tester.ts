import { AnyState, GameState } from "../../src/base/state";
import { Game, PlayerConfig } from "../../src/game";
import { executeQueryOnState } from "../../src/query";
import { MockPlayerIO } from "./mock_io";
import { StateDescription, mockState } from "./mock_state";

export class GameTester {
  private _game: Game | null = null;
  private _state: GameState;

  playerIO: readonly [MockPlayerIO, MockPlayerIO] = [
    new MockPlayerIO(),
    new MockPlayerIO(),
  ];

  constructor(state?: StateDescription) {
    this._state = mockState(state);
  }

  get state() {
    return this._state;
  }

  setState(state: StateDescription) {
    this._state = mockState(state);
  }

  private async pause() {
    return new Promise(() => {});
  }

  query(query: string): AnyState[] {
    return (
      this._game?.query(0, query) ?? executeQueryOnState(this._state, 0, query)
    );
  }

  start() {
    const emptyPlayerConfig: PlayerConfig = {
      cards: [],
      characters: [],
      alwaysOmni: true,
      noShuffle: true,
    };
    this._game = new Game({
      data: this._state.data,
      io: {
        pause: () => this.pause(),
        players: this.playerIO,
      },
      playerConfigs: [emptyPlayerConfig, emptyPlayerConfig],
    });
    this._game.startFromState(this._state);
  }
}
