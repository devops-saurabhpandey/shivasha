import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import EducationAttempt from "../models/EducationAttempt.js";

const objectId = () => new mongoose.Types.ObjectId();

function makeAttempt(overrides = {}) {
  return new EducationAttempt({
    student: objectId(),
    board: "CBSE",
    grade: 10,
    subject: "Mathematics",
    answers: [{
      question: objectId(),
      chapter: "Linear Equations",
      selectedIndex: 1,
      correct: true,
      questionText: "Solve x + 2 = 5.",
      optionsSnapshot: ["1", "3", "5"],
      correctIndexSnapshot: 1,
      explanationSnapshot: "Subtract 2 from both sides."
    }],
    totalQuestions: 1,
    correctCount: 1,
    scorePercent: 100,
    ...overrides
  });
}

test("education attempt stores a stable snapshot for reviewing a submitted answer", () => {
  const attempt = makeAttempt();
  assert.equal(attempt.validateSync(), undefined);
  assert.equal(attempt.answers[0].questionText, "Solve x + 2 = 5.");
  assert.deepEqual(attempt.answers[0].optionsSnapshot, ["1", "3", "5"]);
  assert.equal(attempt.answers[0].selectedIndex, 1);
  assert.equal(attempt.answers[0].correctIndexSnapshot, 1);
  assert.equal(attempt.answers[0].explanationSnapshot, "Subtract 2 from both sides.");
});

test("education attempt rejects unsupported board and out-of-range class", () => {
  const badBoard = makeAttempt({ board: "OTHER" });
  const boardError = badBoard.validateSync();
  assert.ok(boardError?.errors.board);

  const badGrade = makeAttempt({ grade: 13 });
  const gradeError = badGrade.validateSync();
  assert.ok(gradeError?.errors.grade);
});

test("education attempt requires a non-empty answer history and valid score range", () => {
  const empty = makeAttempt({ answers: [], totalQuestions: 0 });
  const emptyError = empty.validateSync();
  assert.ok(emptyError?.errors.totalQuestions);

  const invalidScore = makeAttempt({ scorePercent: 101 });
  const scoreError = invalidScore.validateSync();
  assert.ok(scoreError?.errors.scorePercent);
});
