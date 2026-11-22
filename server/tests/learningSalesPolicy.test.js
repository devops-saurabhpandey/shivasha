import test from "node:test";
import assert from "node:assert/strict";

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const splitSale = (gross, instructorRate, affiliateRate = 0) => {
  if (!Number.isFinite(gross) || gross <= 0) throw new Error("invalid gross");
  if (!Number.isFinite(instructorRate) || instructorRate < 0 || instructorRate > 100) throw new Error("invalid instructor rate");
  if (!Number.isFinite(affiliateRate) || affiliateRate < 0 || affiliateRate > 50) throw new Error("invalid affiliate rate");
  if (instructorRate + affiliateRate > 100) throw new Error("shares exceed gross");
  const instructor = roundMoney(gross * instructorRate / 100);
  const affiliate = roundMoney(gross * affiliateRate / 100);
  return { instructor, affiliate, platform: roundMoney(gross - instructor - affiliate) };
};

test("course revenue split conserves the verified gross sale", () => {
  const split = splitSale(1000, 70, 10);
  assert.deepEqual(split, { instructor: 700, affiliate: 100, platform: 200 });
  assert.equal(roundMoney(split.instructor + split.affiliate + split.platform), 1000);
});

test("course revenue split supports no affiliate attribution", () => {
  assert.deepEqual(splitSale(499, 70), { instructor: 349.3, affiliate: 0, platform: 149.7 });
});

test("course revenue split rejects invalid rates and over-allocation", () => {
  assert.throws(() => splitSale(100, -1, 0));
  assert.throws(() => splitSale(100, 101, 0));
  assert.throws(() => splitSale(100, 70, 51));
  assert.throws(() => splitSale(100, 80, 30));
  assert.throws(() => splitSale(0, 70, 0));
});
