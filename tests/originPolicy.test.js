import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedDevelopmentOrigin, isPrivateLanHost } from "../server/originPolicy.js";

test("private LAN hosts are recognized for local testing", () => {
  for (const host of ["localhost", "127.0.0.1", "192.168.31.26", "10.0.0.4", "172.20.1.9", "gameverse.local"]) assert.equal(isPrivateLanHost(host), true, host);
  for (const host of ["example.com", "8.8.8.8", "172.40.0.1", "192.169.1.1"]) assert.equal(isPrivateLanHost(host), false, host);
});

test("development allows local HTTP origin on the strict Vite port", () => {
  assert.equal(isAllowedDevelopmentOrigin("http://192.168.31.26:5173", "development"), true);
  assert.equal(isAllowedDevelopmentOrigin("http://gameverse.local:5173", "development"), true);
  assert.equal(isAllowedDevelopmentOrigin("http://192.168.31.26:5174", "development"), false);
  assert.equal(isAllowedDevelopmentOrigin("https://192.168.31.26:5173", "development"), false);
});

test("LAN development exception never applies in production", () => {
  assert.equal(isAllowedDevelopmentOrigin("http://192.168.31.26:5173", "production"), false);
});
