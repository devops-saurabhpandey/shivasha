import test from "node:test";
import assert from "node:assert/strict";
import { canCreateSpacePost, canReadSpaceContent, canModerateSpaceContent, canEditSpacePost, canDeleteSpacePost, canEditSpaceComment, canDeleteSpaceComment, normalizeSpacePostText, normalizeSpaceCommentText } from "./socialSpacePostPolicy.js";
test("only active members can publish while resource is active", () => {
 assert.equal(canCreateSpacePost({ resourceStatus: "active", membership: { status: "active" } }), true);
 for (const status of ["pending", "removed", "banned", undefined]) assert.equal(canCreateSpacePost({ resourceStatus: "active", membership: { status } }), false);
 assert.equal(canCreateSpacePost({ resourceStatus: "paused", membership: { status: "active" } }), false);
});
test("public content is readable but private content requires active membership", () => {
 assert.equal(canReadSpaceContent({ resourceStatus: "active", privacy: "public" }), true);
 assert.equal(canReadSpaceContent({ resourceStatus: "active", privacy: "private", membership: { status: "active" } }), true);
 assert.equal(canReadSpaceContent({ resourceStatus: "active", privacy: "private", membership: { status: "pending" } }), false);
 assert.equal(canReadSpaceContent({ resourceStatus: "active", privacy: "invite-only", membership: { status: "removed" } }), false);
 assert.equal(canReadSpaceContent({ resourceStatus: "active", privacy: "public", membership: { status: "banned" } }), false);
 assert.equal(canReadSpaceContent({ resourceStatus: "archived", privacy: "public" }), false);
});
test("moderation is limited to owner admin and moderator", () => {
 for (const role of ["owner", "admin", "moderator"]) assert.equal(canModerateSpaceContent(role), true);
 for (const role of ["member", "unknown", null]) assert.equal(canModerateSpaceContent(role), false);
});
test("authors edit own posts; moderators can delete but not edit others' posts", () => {
 assert.equal(canEditSpacePost({ authorId: "a", requesterId: "a" }), true);
 assert.equal(canEditSpacePost({ authorId: "a", requesterId: "b" }), false);
 assert.equal(canDeleteSpacePost({ authorId: "a", requesterId: "b", requesterRole: "moderator" }), true);
 assert.equal(canDeleteSpacePost({ authorId: "a", requesterId: "b", requesterRole: "member" }), false);
});
test("post and comment text validation rejects empty, non-string and oversized input", () => {
 assert.equal(normalizeSpacePostText("  hello  "), "hello");
 assert.equal(normalizeSpacePostText("  "), null);
 assert.equal(normalizeSpacePostText("x".repeat(3001)), null);
 assert.equal(normalizeSpacePostText({ text: "hello" }), null);
 assert.equal(normalizeSpaceCommentText(" comment "), "comment");
 assert.equal(normalizeSpaceCommentText("x".repeat(1001)), null);
});

test("comment authors can edit; authors and moderators can delete only live comments", () => {
 assert.equal(canEditSpaceComment({ authorId: "a", requesterId: "a" }), true);
 assert.equal(canEditSpaceComment({ authorId: "a", requesterId: "b" }), false);
 assert.equal(canEditSpaceComment({ authorId: "a", requesterId: "a", deletedAt: new Date() }), false);
 assert.equal(canDeleteSpaceComment({ authorId: "a", requesterId: "b", requesterRole: "moderator" }), true);
 assert.equal(canDeleteSpaceComment({ authorId: "a", requesterId: "b", requesterRole: "member" }), false);
 assert.equal(canDeleteSpaceComment({ authorId: "a", requesterId: "a", deletedAt: new Date() }), false);
});
