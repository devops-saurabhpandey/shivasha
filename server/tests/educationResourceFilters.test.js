import test from "node:test";
import assert from "node:assert/strict";
import { buildEducationResourceFilter } from "../utils/educationResourceFilters.js";

test("education resource filters accept supported board, class, subject and type", () => {
  assert.deepEqual(
    buildEducationResourceFilter({ board: "CBSE", grade: "10", subject: "Mathematics", type: "Textbooks" }),
    { filter: { board: "CBSE", grade: 10, subject: "Mathematics", resourceType: "Textbooks" } }
  );
});

test("education resource filters allow an unfiltered catalogue", () => {
  assert.deepEqual(buildEducationResourceFilter({}), { filter: {} });
});

test("education resource filters reject unsupported boards, classes, subjects and types", () => {
  assert.match(buildEducationResourceFilter({ board: "OTHER" }).error, /CBSE, ICSE or ISC/);
  assert.match(buildEducationResourceFilter({ grade: "13" }).error, /1 to 12/);
  assert.match(buildEducationResourceFilter({ grade: "2.5" }).error, /1 to 12/);
  assert.match(buildEducationResourceFilter({ subject: "Astrology" }).error, /supported subject/);
  assert.match(buildEducationResourceFilter({ type: "Pirated PDFs" }).error, /supported resource type/);
});
