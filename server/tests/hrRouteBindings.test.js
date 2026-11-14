import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeFile = fileURLToPath(new URL("../routes/hr.js", import.meta.url));
const source = readFileSync(routeFile, "utf8");

test("company-scoped HR list routes bind the request used by tenant filters", () => {
  for (const route of ["/attendance", "/leaves", "/challans", "/payroll-runs"]) {
    assert.match(
      source,
      new RegExp('router\\.get\\("' + route.replace("/", "\\/") + '", async \\(req, res\\) =>'),
      route + " must bind req because its query uses req.companyId"
    );
  }
});
