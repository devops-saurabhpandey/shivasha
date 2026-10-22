import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit, sanitizeHistory } from "./aiAssistant.js";

test("sanitizeHistory rejects invalid roles and empty content", () => {
  assert.deepEqual(sanitizeHistory([
    { role: "system", content: "not allowed" },
    { role: "user", content: "   " },
    { role: "user", content: 42 },
    null
  ]), []);
});

test("sanitizeHistory keeps only the newest eight valid messages", () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `message-${index}`
  }));
  const result = sanitizeHistory(history);
  assert.equal(result.length, 8);
  assert.equal(result[0].content, "message-2");
  assert.equal(result.at(-1).content, "message-9");
});

test("sanitizeHistory caps total history characters and preserves newest context", () => {
  const result = sanitizeHistory([
    { role: "user", content: "a".repeat(8000) },
    { role: "assistant", content: "b".repeat(8000) }
  ]);
  assert.ok(result.reduce((sum, item) => sum + item.content.length, 0) <= 12000);
  assert.equal(result.at(-1).role, "assistant");
  assert.equal(result.at(-1).content, "b".repeat(8000));
  assert.equal(result[0].content.length, 4000);
});

test("rateLimit allows ten requests and rejects the eleventh in a minute", () => {
  const req = { user: { id: `test-user-${Date.now()}-${Math.random()}` }, ip: "127.0.0.1" };
  let allowed = 0;
  const makeResponse = () => ({
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  });

  for (let i = 0; i < 10; i += 1) {
    rateLimit(req, makeResponse(), () => { allowed += 1; });
  }
  const response = makeResponse();
  rateLimit(req, response, () => { allowed += 1; });

  assert.equal(allowed, 10);
  assert.equal(response.statusCode, 429);
  assert.ok(Number(response.headers["Retry-After"]) > 0);
  assert.match(response.body.message, /Too many AI requests/);
});
