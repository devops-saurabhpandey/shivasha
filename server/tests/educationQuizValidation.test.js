import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestionOptions, isValidSelectedIndex } from "../utils/educationQuizValidation.js";

test("question options accept two to six non-empty trimmed choices", () => {
  assert.deepEqual(normalizeQuestionOptions([" A ", "B"]), ["A", "B"]);
  assert.deepEqual(normalizeQuestionOptions(["A", "B", "C", "D", "E", "F"]), ["A", "B", "C", "D", "E", "F"]);
});

test("question options reject missing, too few, too many, or blank choices", () => {
  assert.equal(normalizeQuestionOptions(null), null);
  assert.equal(normalizeQuestionOptions(["only one"]), null);
  assert.equal(normalizeQuestionOptions(["A", "B", "C", "D", "E", "F", "G"]), null);
  assert.equal(normalizeQuestionOptions(["A", "  "]), null);
});

test("selected answer index must be an integer in range", () => {
  assert.equal(isValidSelectedIndex(0, 4), true);
  assert.equal(isValidSelectedIndex(3, 4), true);
  assert.equal(isValidSelectedIndex(-1, 4), false);
  assert.equal(isValidSelectedIndex(4, 4), false);
  assert.equal(isValidSelectedIndex(null, 4), false);
  assert.equal(isValidSelectedIndex("", 4), false);
  assert.equal(isValidSelectedIndex("0", 4), false);
  assert.equal(isValidSelectedIndex(1.5, 4), false);
});
