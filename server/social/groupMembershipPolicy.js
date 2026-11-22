import { GROUP_MEMBER_ROLE, GROUP_MEMBER_STATUS, GROUP_PRIVACY } from "./groupAccessPolicy.js";

/**
 * Membership requests never grant access immediately. A server route must persist
 * the returned pending state and re-check blocks/current membership on every action.
 */
export function canRequestGroupMembership({ privacy, existingMembership, isBlocked = false, hasValidInvite = false } = {}) {
  if (isBlocked || existingMembership?.status === GROUP_MEMBER_STATUS.BANNED) return false;
  if ([GROUP_MEMBER_STATUS.PENDING, GROUP_MEMBER_STATUS.ACTIVE].includes(existingMembership?.status)) return false;
  if (![GROUP_PRIVACY.PUBLIC, GROUP_PRIVACY.PRIVATE, GROUP_PRIVACY.INVITE_ONLY].includes(privacy)) return false;
  if (privacy === GROUP_PRIVACY.INVITE_ONLY && !hasValidInvite) return false;
  return true;
}

export function canReviewGroupMembership({ actorRole, targetMembership, action } = {}) {
  if (![GROUP_MEMBER_ROLE.OWNER, GROUP_MEMBER_ROLE.ADMIN].includes(actorRole)) return false;
  if (!targetMembership || targetMembership.role === GROUP_MEMBER_ROLE.OWNER) return false;
  if (action === "approve" || action === "reject") {
    return targetMembership.status === GROUP_MEMBER_STATUS.PENDING;
  }
  if (action === "remove" || action === "ban") {
    return targetMembership.status === GROUP_MEMBER_STATUS.ACTIVE;
  }
  return false;
}

export function getGroupMembershipTransition(action, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError("A valid transition date is required");
  const transitions = {
    approve: { status: GROUP_MEMBER_STATUS.ACTIVE, joinedAt: now },
    reject: { status: GROUP_MEMBER_STATUS.REMOVED, joinedAt: null },
    remove: { status: GROUP_MEMBER_STATUS.REMOVED, joinedAt: null },
    ban: { status: GROUP_MEMBER_STATUS.BANNED, joinedAt: null }
  };
  const transition = transitions[action];
  if (!transition) throw new TypeError("Unsupported membership transition");
  return { ...transition };
}
