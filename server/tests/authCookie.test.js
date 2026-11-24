import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  clearAuthCookieOptions,
  parseCookieHeader,
  getRequestAuthToken,
  isAllowedBrowserOrigin,
  isUnsafeMethod
} from "../platform/authCookie.js";

test("SSO cookie defaults to HttpOnly, host-only and same-site", () => {
  const options = getAuthCookieOptions({ NODE_ENV: "production" });
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal("domain" in options, false);
  assert.equal(clearAuthCookieOptions({ NODE_ENV: "production" }).maxAge, undefined);
});

test("cookie domain is opt-in and SameSite=None requires HTTPS in production", () => {
  const options = getAuthCookieOptions({
    NODE_ENV: "production",
    AUTH_COOKIE_DOMAIN: ".shivasha.com",
    AUTH_COOKIE_SAME_SITE: "none"
  });
  assert.equal(options.domain, ".shivasha.com");
  assert.equal(options.sameSite, "none");
  assert.equal(options.secure, true);
});

test("SameSite=None always requires Secure even outside production", () => {
  assert.equal(getAuthCookieOptions({ AUTH_COOKIE_SAME_SITE: "none" }).secure, true);
});

test("parses cookies and safely handles malformed encoding", () => {
  assert.deepEqual(parseCookieHeader("a=1; shivasha_sso=abc%2E123; bad=%E0%A4%A"), {
    a: "1",
    shivasha_sso: "abc.123",
    bad: "%E0%A4%A"
  });
});

test("bearer token takes precedence and cookie token is supported", () => {
  assert.deepEqual(getRequestAuthToken({ headers: {
    authorization: "Bearer header-token",
    cookie: AUTH_COOKIE_NAME + "=cookie-token"
  }}), { token: "header-token", source: "bearer" });
  assert.deepEqual(getRequestAuthToken({ headers: { cookie: AUTH_COOKIE_NAME + "=cookie-token" }}), {
    token: "cookie-token", source: "cookie"
  });
});

test("browser origins are exact-match allowlisted, with configured values overriding defaults", () => {
  assert.equal(isAllowedBrowserOrigin("https://social.shivasha.com", {}), true);
  assert.equal(isAllowedBrowserOrigin("https://evil.shivasha.com", {}), false);
  assert.equal(isAllowedBrowserOrigin("https://custom.example", { FRONTEND_URL: "https://custom.example" }), true);
  assert.equal(isAllowedBrowserOrigin("https://social.shivasha.com", { FRONTEND_URL: "https://custom.example" }), false);
});

test("unsafe methods are identified for cookie CSRF checks", () => {
  assert.equal(isUnsafeMethod("GET"), false);
  assert.equal(isUnsafeMethod("OPTIONS"), false);
  assert.equal(isUnsafeMethod("POST"), true);
  assert.equal(isUnsafeMethod("DELETE"), true);
});
