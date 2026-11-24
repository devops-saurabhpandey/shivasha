/** Social post authorization helpers. */
export function canDeletePost({ authorId, requesterId, requesterRole }) {
  if (!authorId || !requesterId) return false;
  return String(authorId) === String(requesterId) ||
    ["admin", "manager"].includes(requesterRole);
}
