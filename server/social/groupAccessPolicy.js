/**
 * Shared, fail-closed authorization rules for Social groups.
 * Community membership is intentionally separate from group membership.
 */

export const GROUP_PRIVACY = Object.freeze({
  PUBLIC: "public",
  PRIVATE: "private",
  INVITE_ONLY: "invite-only"
});

export const GROUP_MEMBER_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  REMOVED: "removed",
  BANNED: "banned"
});

export const GROUP_MEMBER_ROLE = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  MEMBER: "member"
});

export function isActiveGroupMember(membership) {
  return membership?.status === GROUP_MEMBER_STATUS.ACTIVE;
}

export function canViewGroup({ privacy, membership } = {}) {
  if (membership?.status === GROUP_MEMBER_STATUS.BANNED) return false;
  if (privacy === GROUP_PRIVACY.PUBLIC) return true;
  if (privacy === GROUP_PRIVACY.PRIVATE || privacy === GROUP_PRIVACY.INVITE_ONLY) {
    return isActiveGroupMember(membership);
  }
  return false;
}

export function canPostToGroup({ membership, groupStatus = "active" } = {}) {
  return groupStatus === "active" && isActiveGroupMember(membership);
}

export function canManageGroupSettings(role) {
  return role === GROUP_MEMBER_ROLE.OWNER || role === GROUP_MEMBER_ROLE.ADMIN;
}

export function canModerateGroupContent(role) {
  return canManageGroupSettings(role) || role === GROUP_MEMBER_ROLE.MODERATOR;
}

export function canManageGroupMembership(role) {
  return canManageGroupSettings(role);
}
