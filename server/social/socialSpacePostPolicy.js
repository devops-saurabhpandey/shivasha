export const SPACE_CONTENT_MAX_LENGTH = 3000;
export const SPACE_COMMENT_MAX_LENGTH = 1000;
export function canCreateSpacePost({ resourceStatus, membership } = {}) {
 return resourceStatus === "active" && membership?.status === "active";
}
export function canReadSpaceContent({ resourceStatus, privacy, membership } = {}) {
 if (resourceStatus !== "active" || membership?.status === "banned") return false;
 if (privacy === "public") return true;
 return (privacy === "private" || privacy === "invite-only") && membership?.status === "active";
}
export function canModerateSpaceContent(role) { return ["owner", "admin", "moderator"].includes(role); }
export function canEditSpacePost({ authorId, requesterId } = {}) {
 return Boolean(authorId && requesterId && String(authorId) === String(requesterId));
}
export function canDeleteSpacePost({ authorId, requesterId, requesterRole } = {}) {
 return canEditSpacePost({ authorId, requesterId }) || canModerateSpaceContent(requesterRole);
}
export function normalizeSpacePostText(value) {
 if (typeof value !== "string") return null;
 const text = value.trim();
 return text.length >= 1 && text.length <= SPACE_CONTENT_MAX_LENGTH ? text : null;
}
export function normalizeSpaceCommentText(value) {
 if (typeof value !== "string") return null;
 const text = value.trim();
 return text.length >= 1 && text.length <= SPACE_COMMENT_MAX_LENGTH ? text : null;
}

export function canEditSpaceComment({ authorId, requesterId, deletedAt } = {}) {
 return !deletedAt && canEditSpacePost({ authorId, requesterId });
}
export function canDeleteSpaceComment({ authorId, requesterId, requesterRole, deletedAt } = {}) {
 return !deletedAt && canDeleteSpacePost({ authorId, requesterId, requesterRole });
}
