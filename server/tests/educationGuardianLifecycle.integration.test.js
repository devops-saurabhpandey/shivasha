import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import EducationGuardianLink from "../models/EducationGuardianLink.js";
import EducationAttempt from "../models/EducationAttempt.js";
import educationQuizRoutes from "../routes/educationQuiz.js";

const mongoUri = process.env.MONGODB_TEST_URI;

test("guardian routes enforce expiry, one-time redemption, student consent and per-guardian progress isolation", {
  skip: !mongoUri && "Set MONGODB_TEST_URI to an isolated MongoDB *_test database"
}, async () => {
  const databaseName = decodeURIComponent(new URL(mongoUri).pathname.replace(/^\//, ""));
  if (!databaseName || !/_test$/i.test(databaseName)) {
    throw new Error("Refusing to run guardian integration tests unless MONGODB_TEST_URI names a database ending in _test");
  }
  if (process.env.MONGODB_URI && process.env.MONGODB_URI === guardianMongoUri) {
    throw new Error("MONGODB_TEST_URI must not point at the configured application database");
  }

  process.env.JWT_SECRET = "shivasha-guardian-integration-test-only-secret";
  await mongoose.connect(guardianMongoUri, { serverSelectionTimeoutMS: 15000 });
  const app = express();
  app.use(express.json());
  app.use("/api/education/quiz", educationQuizRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = "http://127.0.0.1:" + server.address().port + "/api/education/quiz";

  try {
    await mongoose.connection.dropDatabase();
    await Promise.all([User.syncIndexes(), EducationGuardianLink.syncIndexes(), EducationAttempt.syncIndexes()]);

    const [student, otherStudent, guardian, secondGuardian] = await Promise.all([
      User.create({ name: "Student A", email: "student-a@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Student B", email: "student-b@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Guardian A", email: "guardian-a@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Guardian B", email: "guardian-b@example.test", passwordHash: "test-hash" })
    ]);
    const users = [student, otherStudent, guardian, secondGuardian];
    const tokens = new Map(users.map(user => [String(user._id), jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "10m" })]));
    const call = async (user, path, method = "GET", body) => {
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          authorization: "Bearer " + tokens.get(String(user._id)),
          ...(body === undefined ? {} : { "content-type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      return { status: response.status, body: await response.json() };
    };

    // Expired invitation codes cannot be redeemed.
    const expiredInvite = await call(student, "/guardian/invite", "POST", {});
    assert.equal(expiredInvite.status, 201);
    const expiredHash = (await import("node:crypto")).createHash("sha256").update(expiredInvite.body.code).digest("hex");
    await EducationGuardianLink.updateOne({ inviteHash: expiredHash }, { $set: { inviteExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await call(guardian, "/guardian/redeem", "POST", { code: expiredInvite.body.code })).status, 400);

    // A fresh code can be redeemed only once, even when two guardians race.
    const invite = await call(student, "/guardian/invite", "POST", {});
    assert.equal(invite.status, 201);
    const redemptions = await Promise.all([
      call(guardian, "/guardian/redeem", "POST", { code: invite.body.code }),
      call(secondGuardian, "/guardian/redeem", "POST", { code: invite.body.code })
    ]);
    assert.equal(redemptions.filter(result => result.status === 201).length, 1, JSON.stringify(redemptions));
    assert.equal(redemptions.filter(result => [400, 409].includes(result.status)).length, 1, JSON.stringify(redemptions));
    const winningGuardian = redemptions[0].status === 201 ? guardian : secondGuardian;
    const losingGuardian = winningGuardian._id.equals(guardian._id) ? secondGuardian : guardian;

    // A pending request does not grant access. Only its student can approve it.
    assert.deepEqual((await call(winningGuardian, "/guardian/children")).body.children, []);
    const requests = await call(student, "/guardian/requests/me");
    assert.equal(requests.status, 200);
    assert.equal(requests.body.requests.length, 1);
    const linkId = requests.body.requests[0]._id;
    assert.equal((await call(otherStudent, "/guardian/links/" + linkId, "PATCH", { action: "approve" })).status, 404);

    // Seed attempts for both students. The guardian must see only the student
    // who explicitly approved this guardian relationship.
    const questionId = new mongoose.Types.ObjectId();
    await EducationAttempt.create([
      { student: student._id, board: "CBSE", grade: 10, subject: "Mathematics", answers: [{ question: questionId, selectedIndex: 0, correct: true }], totalQuestions: 1, correctCount: 1, scorePercent: 100 },
      { student: otherStudent._id, board: "CBSE", grade: 10, subject: "Mathematics", answers: [{ question: new mongoose.Types.ObjectId(), selectedIndex: 0, correct: true }], totalQuestions: 1, correctCount: 1, scorePercent: 100 }
    ]);
    assert.equal((await call(student, "/guardian/links/" + linkId, "PATCH", { action: "approve" })).status, 200);
    const children = await call(winningGuardian, "/guardian/children");
    assert.equal(children.status, 200);
    assert.deepEqual(children.body.children.map(item => item.student.id), [String(student._id)]);
    assert.equal((await call(losingGuardian, "/guardian/children")).body.children.length, 0);

    // Revoke removes progress access immediately.
    assert.equal((await call(student, "/guardian/links/" + linkId, "PATCH", { action: "revoke" })).status, 200);
    assert.deepEqual((await call(winningGuardian, "/guardian/children")).body.children, []);

    // Rejection also leaves the guardian without access.
    const rejectInvite = await call(student, "/guardian/invite", "POST", {});
    const rejectRedeem = await call(losingGuardian, "/guardian/redeem", "POST", { code: rejectInvite.body.code });
    assert.equal(rejectRedeem.status, 201);
    const rejectRequest = await call(student, "/guardian/requests/me");
    const rejectLinkId = rejectRequest.body.requests[0]._id;
    assert.equal((await call(student, "/guardian/links/" + rejectLinkId, "PATCH", { action: "reject" })).status, 200);
    assert.deepEqual((await call(losingGuardian, "/guardian/children")).body.children, []);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
});
