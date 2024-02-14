import { AnyState, GameState } from "../../src/base/state";
import { Game, PlayerConfig } from "../../src/game";
import { executeQueryOnState } from "../../src/query";
import { ActionResponseStr, MockPlayerIO } from "./mock_io";
import { StateDescription, mockState } from "./mock_state";

const EMPTY_PLAYER_CONFIG: PlayerConfig = {
  cards: [],
  characters: [],
  alwaysOmni: true,
  noShuffle: true,
};

export class GameTester {
  private _game: Game | null = null;
  private _state: GameState;
  readonly _initialState: GameState;
  private _continue: () => void = () => {};
  private _fulfillPauseCondition: () => void = () => {};
  private _pauseCondition: () => unknown = () => false;

  playerIO: readonly [MockPlayerIO, MockPlayerIO] = [
    new MockPlayerIO(),
    new MockPlayerIO(),
  ];

  constructor(state?: StateDescription) {
    this._state = mockState(state);
    this._initialState = this._state;
  }

  get state() {
    return this._state;
  }

  setState(state: StateDescription) {
    this._state = mockState(state);
  }
  reset() {
    this._state = this._initialState;
  }

  private async pause(st: GameState) {
    if (this._pauseCondition()) {
      this._fulfillPauseCondition();
      return new Promise<void>((resolve) => {
        this._continue = resolve;
      });
    }
  }

  $$(query: string): AnyState[] {
    return (
      this._game?.query(0, query) ?? executeQueryOnState(this._state, 0, query)
    );
  }
  $(query: string): AnyState | undefined {
    return this.$$(query)[0];
  }

  setMyActions(...action: ActionResponseStr[]) {
    this.playerIO[0].actionQueue = action;
    return this;
  }
  setOppActions(...action: ActionResponseStr[]) {
    this.playerIO[1].actionQueue = action;
    return this;
  }

  private start() {
    this._game = new Game({
      data: this._state.data,
      io: {
        pause: (st) => this.pause(st),
        players: this.playerIO,
        onIoError: (e) => {
          console.error(e);
        }
      },
      playerConfigs: [EMPTY_PLAYER_CONFIG, EMPTY_PLAYER_CONFIG],
    });
    this._game.startFromState(this._state);
  }

  private waitFulfill() {
    return new Promise<void>((resolve) => {
      this._fulfillPauseCondition = resolve;
    });
  }

  runUntilMyActionDone() {
    this._pauseCondition = () => {
      return this.playerIO[0].actionQueue.length === 0;
    };
    this.start();
    return this.waitFulfill();
  }

  runUntilNextRound() {
    const currentRound = this._state.roundNumber;
    this._pauseCondition = () => {
      return this._state.roundNumber > currentRound;
    };
    this.start();
    return this.waitFulfill();
  }
}
