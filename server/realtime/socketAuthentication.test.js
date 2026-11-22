import test from "node:test";
import assert from "node:assert/strict";
import { authenticateSocketUser } from "./socketAuthentication.js";

const verifyToken = token => token === "valid" ? { id: "user-1", role: "employee" } : (() => { throw new Error("bad token"); })();

test("rejects missing credentials and invalid tokens", async () => {
  const findUser = async () => ({ _id: "user-1" });
  assert.equal((await authenticateSocketUser({ token: "", jwtSecret: "secret", verifyToken, findUser })).ok, false);
  assert.equal((await authenticateSocketUser({ token: "valid", jwtSecret: "", verifyToken, findUser })).ok, false);
  assert.equal((await authenticateSocketUser({ token: "bad", jwtSecret: "secret", verifyToken, findUser })).error, "Invalid authentication token");
});

test("rejects deleted and moderation-blocked accounts", async () => {
  const base = { token: "valid", jwtSecret: "secret", verifyToken };
  assert.equal((await authenticateSocketUser({ ...base, findUser: async () => null })).error, "Account not found");
  assert.equal((await authenticateSocketUser({ ...base, findUser: async () => ({ _id: "user-1", moderationBlocked: true }) })).error, "This account is temporarily restricted");
});

test("returns normalized authenticated user identity", async () => {
  const result = await authenticateSocketUser({
    token: "valid",
    jwtSecret: "secret",
    verifyToken,
    findUser: async () => ({ _id: "user-1", moderationBlocked: false })
  });
  assert.deepEqual(result, { ok: true, user: { id: "user-1", role: "employee" } });
});

test("fails closed if account lookup is unavailable", async () => {
  const result = await authenticateSocketUser({
    token: "valid", jwtSecret: "secret", verifyToken,
    findUser: async () => { throw new Error("database down"); }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Authentication unavailable");
});
