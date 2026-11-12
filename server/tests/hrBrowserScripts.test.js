import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

for (const path of ["public/hr.html", "public/payroll.html"]) {
  test(path + " inline browser scripts parse successfully", () => {
    const html = readFileSync(new URL("../../" + path, import.meta.url), "utf8");
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length > 0, "Expected at least one inline script");
    for (const [index, match] of scripts.entries()) {
      assert.doesNotThrow(() => new Script(match[1], { filename: path + "#" + index }));
    }
  });
}
