import { createHash, randomBytes } from "node:crypto";

export const SOCIAL_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export function createSocialInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSocialInviteToken(token) };
}

export function hashSocialInviteToken(token) {
  if (typeof token !== "string" || token.length < 32 || token.length > 256) {
    throw new TypeError("Invalid invitation token");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getSocialInviteExpiry(now = new Date()) {
  return new Date(now.getTime() + SOCIAL_INVITE_TTL_MS);
}

export function buildPendingSocialInviteFilter(tokenHash, now = new Date()) {
  return { tokenHash, status: "pending", expiresAt: { $gt: now } };
}

export function buildSocialInviteClaimUpdate(userId, now = new Date()) {
  return { $set: { status: "redeemed", redeemedBy: userId, redeemedAt: now } };
}

export function buildSocialInviteRollbackFilter(inviteId, userId, redeemedAt) {
  return { _id: inviteId, status: "redeemed", redeemedBy: userId, redeemedAt };
}

export function canIssueSocialInvite({ resourceStatus, actorRole } = {}) {
  return resourceStatus === "active" && ["owner", "admin"].includes(actorRole);
}
