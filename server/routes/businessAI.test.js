import test from "node:test";
import assert from "node:assert/strict";
import router from "./businessAI.js";
import { requireAuth } from "../middleware/auth.js";

test("Business AI ask endpoint requires authentication before its handler", () => {
  const layer = router.stack.find(item => item.route?.path === "/ask");
  assert.ok(layer, "POST /ask route must be registered");
  assert.equal(layer.route.methods.post, true);
  assert.equal(layer.route.stack[0].handle, requireAuth);
});
