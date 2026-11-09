import test from "node:test";
import assert from "node:assert/strict";
import { GAME_META } from "../shared/gameEngine.js";
import { validateRoomRequest, createWaitingRoom } from "../server/roomFactory.js";

const user = { userId: "user-1", username: "Mahek", avatar: { type: "girl", hair: "#34223d" } };

test("room factory accepts all configured game IDs and their minimum player counts", () => {
  for (const [gameId, meta] of Object.entries(GAME_META)) {
    assert.deepEqual(validateRoomRequest(gameId, meta.min), { slots: meta.min }, gameId);
  }
});

test("room factory rejects unknown games and out-of-range slots", () => {
  assert.match(validateRoomRequest("unknown", 2).error, /Game not found/);
  assert.match(validateRoomRequest("uno-no-mercy", 1).error, /Player slots/);
  assert.match(validateRoomRequest("ludo", 5).error, /Player slots/);
  assert.match(validateRoomRequest("raja-mantri", 3).error, /exactly 4/);
});

test("HTTP-created host starts ready but disconnected until lobby socket resumes", () => {
  const room = createWaitingRoom({ code: "ABC123", gameId: "uno-no-mercy", playerSlots: 4, user });
  assert.equal(room.mode, "uno-no-mercy");
  assert.equal(room.maxPlayers, 4);
  assert.equal(room.hostId, user.userId);
  assert.deepEqual(room.players[0], { ...user, socketId: null, ready: true, connected: false });
  assert.equal(room.status, "waiting");
});

test("socket-created host starts ready and connected with its current socket ID", () => {
  const room = createWaitingRoom({ code: "ABC124", gameId: "ludo", playerSlots: 2, user, socketId: "socket-1" });
  assert.equal(room.players[0].socketId, "socket-1");
  assert.equal(room.players[0].connected, true);
  assert.equal(room.players[0].ready, true);
});

test("room factory refuses missing room code or unauthenticated user", () => {
  assert.throws(() => createWaitingRoom({ code: "ABC123", gameId: "ludo", playerSlots: 2, user: {} }), /authenticated user/);
  assert.throws(() => createWaitingRoom({ code: "", gameId: "ludo", playerSlots: 2, user }), /Room code/);
});
