import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { waitForSocketConnection } from "../src/socketConnection.js";

class FakeSocket extends EventEmitter {
  connected = false;
  connectCalls = 0;
  connect() {
    this.connectCalls += 1;
    setImmediate(() => { this.connected = true; this.emit("connect"); });
  }
  off(event, listener) { return super.off(event, listener); }
}

test("socket connection helper resolves immediately for an already connected socket", async () => {
  const socket = new FakeSocket();
  socket.connected = true;
  await waitForSocketConnection(socket, 100);
  assert.equal(socket.connectCalls, 0);
});

test("socket connection helper waits for initial connection instead of failing on click race", async () => {
  const socket = new FakeSocket();
  await waitForSocketConnection(socket, 500);
  assert.equal(socket.connected, true);
  assert.equal(socket.connectCalls, 1);
  assert.equal(socket.listenerCount("connect"), 0);
  assert.equal(socket.listenerCount("connect_error"), 0);
});

test("socket connection helper reports useful connection errors after timeout", async () => {
  const socket = new FakeSocket();
  socket.connect = function () {
    this.connectCalls += 1;
    setImmediate(() => this.emit("connect_error", new Error("LAN proxy unavailable")));
  };
  await assert.rejects(waitForSocketConnection(socket, 25), /LAN proxy unavailable/);
  assert.equal(socket.listenerCount("connect"), 0);
  assert.equal(socket.listenerCount("connect_error"), 0);
});

test("socket connection helper rejects a missing socket with a user-readable message", async () => {
  await assert.rejects(waitForSocketConnection(null, 50), /initialize ho rahi hai/);
});
