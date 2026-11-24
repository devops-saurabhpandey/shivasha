import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import authRoutes from "../routes/auth.js";
import User from "../models/User.js";

const origins = [
  "https://social.shivasha.com",
  "https://business.shivasha.com",
  "https://edutech.shivasha.com",
  "https://enterprise.shivasha.com"
];
const enabled = Boolean(process.env.MONGODB_TEST_URI);
let server;
let baseUrl;
let user;

before(async () => {
  if (!enabled) return;
  process.env.JWT_SECRET ||= "integration-test-key-only";
  process.env.AUTH_COOKIE_SSO = "true";
  process.env.AUTH_COOKIE_SECURE = "false";
  process.env.AUTH_COOKIE_SAME_SITE = "lax";
  process.env.FRONTEND_URL = origins.join(",");
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  user = await User.create({
    name: "SSO Test User",
    email: `sso-test-${process.pid}-${Date.now()}@example.test`,
    passwordHash: await bcrypt.hash("test-password-123", 4)
  });
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!enabled) return;
  if (user?._id) await User.deleteOne({ _id: user._id });
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
});

test("SSO login, shared session and logout work from each product origin", {
  skip: !enabled && "MONGODB_TEST_URI is not configured"
}, async t => {
  for (const origin of origins) {
    await t.test(origin, async () => {
      const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email: user.email, password: "test-password-123" })
      });
      assert.equal(login.status, 200);
      const payload = await login.json();
      assert.equal(payload.sso, true);
      assert.equal("token" in payload, false);

      const cookieLine = (login.headers.getSetCookie?.() || []).find(value => value.startsWith("shivasha_sso="));
      assert.ok(cookieLine, "login must set the SSO cookie");
      assert.match(cookieLine, /HttpOnly/i);
      const cookie = cookieLine.split(";", 1)[0];

      const session = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie, origin } });
      assert.equal(session.status, 200);
      const body = await session.json();
      assert.equal(body.authMethod, "cookie");
      assert.equal(body.identity.email, user.email);
      assert.deepEqual(body.applications.map(item => item.productId), ["social", "business", "edutech", "enterprise"]);
      assert.equal(JSON.stringify(body).includes("tenantId"), false);

      const logout = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { cookie, origin }
      });
      assert.equal(logout.status, 200);
      assert.match((logout.headers.getSetCookie?.() || []).join(";"), /shivasha_sso=;/);
    });
  }
});

test("SSO rejects login without a trusted origin and logout from an untrusted origin", {
  skip: !enabled && "MONGODB_TEST_URI is not configured"
}, async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://untrusted.example" },
    body: JSON.stringify({ email: user.email, password: "test-password-123" })
  });
  assert.equal(login.status, 403);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { origin: "https://untrusted.example" }
  });
  assert.equal(logout.status, 403);
});
