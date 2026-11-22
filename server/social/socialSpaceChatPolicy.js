export function canDeleteSpaceChatMessage({ senderId, requesterId, requesterRole } = {}) {
  if (!senderId || !requesterId) return false;
  return String(senderId) === String(requesterId) ||
    ["owner", "admin", "moderator"].includes(requesterRole);
}
