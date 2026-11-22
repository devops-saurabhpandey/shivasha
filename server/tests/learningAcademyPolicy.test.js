import test from "node:test";
import assert from "node:assert/strict";

const validPrice = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000;
const validLessons = lessons => Array.isArray(lessons) && lessons.length >= 1 && lessons.length <= 100 && lessons.every(l => typeof l.title === "string" && l.title.trim().length > 0 && Number.isFinite(Number(l.durationMinutes || 0)) && Number(l.durationMinutes || 0) >= 0 && Number(l.durationMinutes || 0) <= 1000);

test("free and paid prices are valid within the configured limit", () => {
  assert.equal(validPrice(0), true);
  assert.equal(validPrice(499), true);
  assert.equal(validPrice(-1), false);
  assert.equal(validPrice(1000001), false);
  assert.equal(validPrice("unknown"), false);
});

test("course must contain 1 to 100 titled lessons", () => {
  assert.equal(validLessons([{title:"Intro"}]), true);
  assert.equal(validLessons([]), false);
  assert.equal(validLessons(Array.from({length:101},(_,i)=>({title:"Lesson "+i}))), false);
  assert.equal(validLessons([{title:"  "}]), false);
});

test("lesson duration cannot be negative or over 1000 minutes", () => {
  assert.equal(validLessons([{title:"Intro",durationMinutes:0}]), true);
  assert.equal(validLessons([{title:"Intro",durationMinutes:-1}]), false);
  assert.equal(validLessons([{title:"Intro",durationMinutes:1001}]), false);
});
