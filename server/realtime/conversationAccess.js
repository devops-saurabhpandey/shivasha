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
