// Copyright (C) 2024 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import {
  Match,
  Show,
  Switch,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import data from "@gi-tcg/data";
import { GameStateLogEntry, deserializeGameStateLog } from "@gi-tcg/core";
import { StandaloneChild } from "./StandaloneChild";
import { StandaloneParent } from "./StandaloneParent";
import { reject } from "core-js/fn/promise";
import { MultiplayerHost } from "./MultiplayerHost";
import { MultiplayerGuest } from "./MultiplayerGuest";

enum GameMode {
  NotStarted = 0,
  Standalone = 1,
  MultiplayerHost = 2,
  MultiplayerGuest = 3,
}

export function App() {
  if (window.opener !== null) {
    // eslint-disable-next-line solid/components-return-once
    return <StandaloneChild />;
  }
  const [mode, setMode] = createSignal<GameMode>(GameMode.NotStarted);
  const [logs, setLogs] = createSignal<GameStateLogEntry[]>();
  const [deck0, setDeck0] = createSignal(
    "AVCg3jUPA0Bw9ZUPCVCw9qMPCoBw+KgPDNEgCMIQDKFgCsYQDLGQC8kQDeEQDtEQDfAA",
  );
  const [deck1, setDeck1] = createSignal(
    "AeFB8ggQAxEB85gQCkFx9b4QDVEh9skQDWGR+coQDdLRA9wRDqLxDOARD7IBD+ERD+EB",
  );
  const [roomId, setRoomId] = createSignal<string>("");
  const importLog = async () => {
    return new Promise<GameStateLogEntry[]>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (!file) {
          reject(`Failed to read uploaded file`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const contents = event.target?.result as string;
          try {
            const logs = JSON.parse(contents);
            resolve(deserializeGameStateLog(data, logs));
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsText(file);
      };
      input.oncancel = () => {
        reject(`File upload canceled`);
      };
      input.click();
    });
  };

  return (
    <div>
      <Switch>
        <Match when={mode() === GameMode.NotStarted}>
          <div class="tabs">
            <div class="tab">
              <input
                class="tab__input"
                type="radio"
                name="gameModeTab"
                id="standaloneInput"
                checked
              />
              <label class="tab__header" for="standaloneInput">
                本地模拟
              </label>
              <div class="tab__content config-panel">
                <div class="config-panel__title">牌组配置</div>
                <div class="config-panel__deck">
                  <label>先手牌组</label>
                  <input
                    type="text"
                    value={deck0()}
                    onInput={(e) => setDeck0(e.currentTarget.value)}
                  />
                </div>
                <div class="config-panel__deck">
                  <label>后手牌组</label>
                  <input
                    type="text"
                    value={deck1()}
                    onInput={(e) => setDeck1(e.currentTarget.value)}
                  />
                </div>
                <div class="config-panel__description">
                  点击下方按钮开始对局；先手方棋盘会在弹出窗口显示，后手方棋盘在本页面显示。
                  <br />
                  （若弹窗不显示为浏览器阻止，请允许本页面使用弹出式窗口。）
                </div>
                <div class="config-panel__button-group">
                  <button onClick={() => setMode(1)}>开始对局</button>
                  <button
                    onClick={async () => {
                      const logs = await importLog().catch(alert);
                      if (logs) {
                        setLogs(logs);
                        setMode(1);
                      }
                    }}
                  >
                    导入日志
                  </button>
                </div>
              </div>
            </div>
            <div class="tab">
              <input
                class="tab__input"
                type="radio"
                name="gameModeTab"
                id="multiplayerInput"
              />
              <label class="tab__header" for="multiplayerInput">
                多人对战
              </label>
              <div class="tab__content config-panel">
                <div class="config-panel__title">牌组配置</div>
                <div class="config-panel__deck">
                  <label>我方牌组</label>
                  <input
                    type="text"
                    value={deck0()}
                    onInput={(e) => setDeck0(e.currentTarget.value)}
                  />
                </div>
                <div class="config-panel__title">房间号</div>
                <div class="config-panel__room-id">
                  <input
                    type="text"
                    value={roomId()}
                    placeholder="创建新房间"
                    onInput={(e) => setRoomId(e.currentTarget.value)}
                  />
                </div>
                <div class="config-panel__description">
                  房间号置空则创建新房间，否则加入指定房间。
                  <span class="text-danger">多人对战模式是实验性的，可能存在大量 bug。</span>
                </div>
                <div class="config-panel__button-group">
                  <button onClick={() => setMode(roomId() === "" ? GameMode.MultiplayerHost : GameMode.MultiplayerGuest)}>
                    {roomId() === "" ? "创建房间" : "加入房间"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Match>
        <Match when={mode() === GameMode.Standalone}>
          <StandaloneParent logs={logs()} deck0={deck0()} deck1={deck1()} />
        </Match>
        <Match when={mode() === GameMode.MultiplayerHost}>
          <MultiplayerHost deck={deck0()} />
        </Match>
        <Match when={mode() === GameMode.MultiplayerGuest}>
          <MultiplayerGuest deck={deck0()} roomId={roomId()} />
        </Match>
      </Switch>
    </div>
  );
}
