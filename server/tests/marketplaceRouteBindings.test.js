import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeFile = fileURLToPath(new URL("../routes/businessPlatform.js", import.meta.url));
const source = readFileSync(routeFile, "utf8");

test("global marketplace endpoints are protected by the authenticated business platform router", () => {
  assert.match(source, /router\.use\(requireAuth\)/);
  for (const [method, route] of [
    ["get", "/marketplace/listings"],
    ["get", "/marketplace/my-listings"],
    ["post", "/marketplace/listings"],
    ["get", "/marketplace/inquiries"],
    ["post", "/marketplace/inquiries"],
    ["patch", "/marketplace/inquiries/:id"]
  ]) {
    assert.match(source, new RegExp('router\\.' + method + '\\("' + route.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") + '"'));
  }
});

test("marketplace inquiries require explicit consent and prevent self-inquiries", () => {
  assert.match(source, /req\.body\?\.consentToShare !== true/);
  assert.match(source, /You cannot send an inquiry to your own listing/);
  assert.match(source, /provider: req\.user\.id/);
  assert.match(source, /requester: req\.user\.id/);
});

test("marketplace listing creation validates department, description, price and currency", () => {
  assert.match(source, /marketplaceDepartments\.includes\(department\)/);
  assert.match(source, /description\.length < 20/);
  assert.match(source, /priceFrom < 0/);
  assert.match(source, /USD.*INR.*EUR.*GBP.*AED.*CAD.*AUD/);
});
