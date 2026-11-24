import { isBlockedEitherDirection } from "../social/blockPolicy.js";

/**
 * A socket may emit conversation-scoped realtime events only after the
 * server has verified participant membership and joined this exact room.
 */
export function isConversationRoomAuthorized(socket, conversationId) {
  if (!socket || typeof conversationId !== "string") return false;
  const id = conversationId.trim();
  if (!id || id.length > 64 || !socket.rooms || typeof socket.rooms.has !== "function") return false;
  return socket.rooms.has("conversation:" + id);
}

 
/** Re-check both users' current block lists before allowing realtime access. */
export async function isConversationPeerBlocked({ participantIds, userId, findUser }) {
  if (!Array.isArray(participantIds) || typeof userId !== "string" || typeof findUser !== "function") return true;
  const peers = participantIds.map(id => String(id)).filter(id => id !== userId);
  if (!participantIds.some(id => String(id) === userId) || peers.length !== 1) return true;
  const [viewer, other] = await Promise.all([findUser(userId), findUser(peers[0])]);
  if (!viewer || !other) return true;
  return isBlockedEitherDirection(userId, peers[0], viewer.blockedUsers || [], other.blockedUsers || []);
}
