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

import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { upgradeWebSocket } from "hono/cloudflare-workers";

type Bindings = {
  DB: D1Database;
};
type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.use(cors({ origin: "*" }));

const POLL_INTERVAL = 500;
const sleep = () =>
  new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

const enum RoomStatus {
  Free = 0,
  Pending = 1,
  Active = 2,
}

const CLEAN_UP = [
  `
WITH outdated AS (
  SELECT * FROM rooms WHERE created_at < datetime('now', '-1 day')
)
  DELETE FROM messages WHERE room_id IN (SELECT room_id FROM outdated);`,
  `UPDATE rooms SET room_status = 0 WHERE created_at < datetime('now', '-1 day');`,
];

app.get(
  "/ws/request-room",
  upgradeWebSocket((c: Context<Env, any, {}>) => {
    let roomId: number | null = null;
    let closed = false;
    let wsSend: ((data: string) => void) | null = null;
    let wsClose: (() => void) | null = null;
    const poll = async () => {
      outer: while (!closed) {
        do {
          if (wsSend === null) {
            break;
          }
          const result = await c.env.DB.prepare(
            `SELECT room_status FROM rooms WHERE id = ?`,
          )
            .bind(roomId)
            .first();
          if (result?.room_status !== RoomStatus.Active) {
            wsSend(
              JSON.stringify({ method: "error", message: "Room is closing" }),
            );
            closed = true;
            wsClose?.();
            break outer;
          }
          const { success, results } = await c.env.DB.prepare(
            `DELETE FROM messages WHERE room_id = ? AND host_to_guest = 0 RETURNING *`,
          )
            .bind(roomId)
            .all();
          if (!success || results.length === 0) {
            break;
          }
          for (const result of results) {
            wsSend(result.content as string);
          }
        } while (false);
        await sleep();
      }
    };
    poll();
    return {
      async onMessage(evt, ws) {
        try {
          const data = JSON.parse(evt.data);
          console.log(data);
          switch (data.method) {
            case "initialize": {
              await c.env.DB.batch(
                CLEAN_UP.map((sql) => c.env.DB.prepare(sql)),
              );
              if (roomId !== null) {
                throw new Error("Room already initialized");
              }
              let who: 0 | 1;
              if (data.who === 0 || data.who === 1) {
                who = data.who;
              } else {
                who = Math.random() < 0.5 ? 0 : 1;
              }
              const result = await c.env.DB.prepare(
                `SELECT id FROM rooms WHERE room_status = 0 ORDER BY RANDOM() LIMIT 1`,
              ).first();
              if (!result) {
                throw new Error("No available rooms");
              }
              roomId = result.id as number;
              const { success, error } = await c.env.DB.prepare(
                `UPDATE rooms SET room_status = 1, host_who = ? WHERE id = ?`,
              )
                .bind(who, roomId)
                .run();
              if (!success) {
                throw error;
              }
              ws.send(JSON.stringify({ method: "roomId", roomId }));
              let guestDeck = "";
              while (true) {
                const result = await c.env.DB.prepare(
                  `SELECT room_status, guest_deck FROM rooms WHERE id = ?`,
                )
                  .bind(roomId)
                  .first();
                if (result?.room_status === RoomStatus.Active) {
                  guestDeck = result.guest_deck as string;
                  break;
                }
                await sleep();
              }
              wsSend = (data) => ws.send(data);
              wsClose = () => ws.close();
              ws.send(
                JSON.stringify({ method: "reply:initialize", who, guestDeck }),
              );
              break;
            }
            case "notify":
            case "rpc": {
              if (roomId === null) {
                throw new Error("Room not initialized");
              }
              const result = await c.env.DB.prepare(
                `SELECT room_status FROM rooms WHERE id = ?`,
              )
                .bind(roomId)
                .first();
              if (result?.room_status !== RoomStatus.Active) {
                ws.send(
                  JSON.stringify({
                    method: "error",
                    message: `Room not ready or already closed`,
                  }),
                );
                ws.close();
                break;
              }
              await c.env.DB.prepare(
                `INSERT INTO messages (room_id, content, host_to_guest) VALUES (?, ?, 1)`,
              )
                .bind(roomId, evt.data)
                .run();
              break;
            }
            default:
              throw new Error(`Unknown method ${data.method}`);
          }
        } catch (e) {
          console.error(e);
          ws.send(
            JSON.stringify({
              method: "error",
              message: e instanceof Error ? e.message : "Unknown error",
            }),
          );
        }
      },
      onClose(evt, ws) {
        console.log(`host closed room ${roomId}`);
        closed = true;
        ws.close();
      },
    };
  }),
);

app.get(
  "/ws/room/:id",
  upgradeWebSocket((c: Context<Env, any, {}>) => {
    const roomId = parseInt(c.req.param("id"));
    let initialized = false;
    let closed = false;
    let wsSend: ((data: string) => void) | null = null;
    let wsClose: (() => void) | null = null;
    const poll = async () => {
      outer: while (!closed) {
        do {
          if (wsSend === null) {
            break;
          }
          const result = await c.env.DB.prepare(
            `SELECT room_status FROM rooms WHERE id = ?`,
          )
            .bind(roomId)
            .first();
          if (result?.room_status !== RoomStatus.Active) {
            wsSend(
              JSON.stringify({ method: "error", message: "Room is closing" }),
            );
            closed = true;
            break outer;
          }
          const { success, results } = await c.env.DB.prepare(
            `DELETE FROM messages WHERE room_id = ? AND host_to_guest = 1 RETURNING *`,
          )
            .bind(roomId)
            .all();
          if (!success || results.length === 0) {
            break;
          }
          for (const result of results) {
            wsSend(result.content as string);
          }
        } while (false);
        await sleep();
      }
    };
    poll();
    return {
      async onMessage(evt, ws) {
        try {
          const data = JSON.parse(evt.data);
          console.log(data);
          switch (data.method) {
            case "initialize": {
              // await c.env.DB.batch(CLEAN_UP.map((sql) => c.env.DB.prepare(sql)));
              if (isNaN(roomId)) {
                ws.send(
                  JSON.stringify({
                    method: "error",
                    message: "Invalid room ID",
                  }),
                );
                ws.close();
                break;
              }
              if (initialized) {
                throw new Error("Room already initialized");
              }
              if (typeof data.deck !== "string") {
                ws.send(
                  JSON.stringify({
                    method: "error",
                    message: "Invalid deck",
                  }),
                );
                ws.close();
                break;
              }
              const result = await c.env.DB.prepare(
                `SELECT room_status, host_who FROM rooms WHERE id = ?`,
              )
                .bind(roomId)
                .first();
              if (result?.room_status !== RoomStatus.Pending) {
                ws.send(
                  JSON.stringify({
                    method: "error",
                    message: "Room not found",
                  }),
                );
                ws.close();
                break;
              }
              const who = result?.host_who === 0 ? 1 : 0;
              await c.env.DB.prepare(
                `UPDATE rooms SET room_status = 2, guest_deck = ? WHERE id = ?`,
              )
                .bind(data.deck, roomId)
                .run();
              wsSend = (data) => ws.send(data);
              wsClose = () => ws.close();
              ws.send(JSON.stringify({ method: "reply:initialize", who }));
              initialized = true;
              break;
            }
            case "reply:rpc":
            case "giveUp": {
              if (!initialized) {
                throw new Error("Room not initialized");
              }
              const result = await c.env.DB.prepare(
                `SELECT room_status FROM rooms WHERE id = ?`,
              )
                .bind(roomId)
                .first();
              if (result?.room_status !== RoomStatus.Active) {
                ws.send(
                  JSON.stringify({
                    method: "error",
                    message: "Room not ready or already closed",
                  }),
                );
                ws.close();
                break;
              }
              await c.env.DB.prepare(
                `INSERT INTO messages (room_id, content, host_to_guest) VALUES (?, ?, 0)`,
              )
                .bind(roomId, evt.data)
                .run();
              break;
            }
            default:
              throw new Error(`Unknown method ${data.method}`);
          }
        } catch (e) {
          console.error(e);
          ws.send(
            JSON.stringify({
              method: "error",
              message: e instanceof Error ? e.message : "Unknown error",
            }),
          );
        }
      },
      onClose(evt, ws) {
        console.log(`guest closed room ${roomId}`);
        closed = true;
        ws.close();
      },
    };
  }),
);

app.notFound((c) => c.text("Not Found", 404));

app.onError((err, c) => {
  return c.text(`Internal Server Error: ${err.message}`, 500);
});

export default app;
