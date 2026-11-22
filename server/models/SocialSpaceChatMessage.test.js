import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import SocialSpaceChatMessage from "./SocialSpaceChatMessage.js";

test("SocialSpaceChatMessage enforces resource-scoped chat fields and text limits", async () => {
  const valid = new SocialSpaceChatMessage({
    resourceType: "group",
    resourceId: new mongoose.Types.ObjectId(),
    senderId: new mongoose.Types.ObjectId(),
    text: "Hello active members",
    readBy: []
  });
  await assert.doesNotReject(valid.validate());
  const invalidType = new SocialSpaceChatMessage({ resourceType: "direct", resourceId: new mongoose.Types.ObjectId(), senderId: new mongoose.Types.ObjectId(), text: "Hello" });
  await assert.rejects(invalidType.validate());
  const empty = new SocialSpaceChatMessage({ resourceType: "community", resourceId: new mongoose.Types.ObjectId(), senderId: new mongoose.Types.ObjectId(), text: "   " });
  await assert.rejects(empty.validate());
  const tooLong = new SocialSpaceChatMessage({ resourceType: "group", resourceId: new mongoose.Types.ObjectId(), senderId: new mongoose.Types.ObjectId(), text: "x".repeat(2001) });
  await assert.rejects(tooLong.validate());
  const removed = new SocialSpaceChatMessage({ resourceType: "group", resourceId: new mongoose.Types.ObjectId(), senderId: new mongoose.Types.ObjectId(), text: "This message was removed", deletedAt: new Date(), deletedBy: new mongoose.Types.ObjectId() });
  await assert.doesNotReject(removed.validate());
});
