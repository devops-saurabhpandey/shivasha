import test from "node:test";
import assert from "node:assert/strict";

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const commissionFor = (gross, rate) => {
  if (!Number.isFinite(Number(gross)) || Number(gross) < 0.01 || Number(gross) > 1000000000) throw new Error("invalid gross");
  if (!Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 50) throw new Error("invalid rate");
  return roundMoney(Number(gross) * Number(rate) / 100);
};

test("calculates commission to two decimal places", () => {
  assert.equal(commissionFor(1999, 10), 199.9);
  assert.equal(commissionFor(100.25, 7.5), 7.52);
});

test("rejects zero, negative and excessive transaction amounts", () => {
  for (const amount of [0, -1, 1000000001, "not-a-number"]) assert.throws(() => commissionFor(amount, 10));
});

test("rejects commission rates outside 0 to 50 percent", () => {
  for (const rate of [-0.01, 50.01, "NaN"]) assert.throws(() => commissionFor(100, rate));
});

test("zero percent is allowed but produces no payable commission", () => {
  assert.equal(commissionFor(1000, 0), 0);
});
