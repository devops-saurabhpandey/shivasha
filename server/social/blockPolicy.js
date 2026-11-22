/** Fail-closed Social block relationship policy helpers. */
export function buildPostVisibilityFilter(viewerId, viewerBlockedIds = [], blockerIds = [], extra = {}) {
  if (!viewerId) throw new TypeError("viewerId is required");
  const excluded = new Set([...viewerBlockedIds, ...blockerIds].filter(Boolean).map(String));
  return { ...extra, author: { $nin: [...excluded] } };
}

export function isBlockedEitherDirection(viewerId, targetId, viewerBlockedIds = [], targetBlockedIds = []) {
  if (!viewerId || !targetId || String(viewerId) === String(targetId)) return false;
  const viewerBlocks = viewerBlockedIds.some(id => String(id) === String(targetId));
  const targetBlocks = targetBlockedIds.some(id => String(id) === String(viewerId));
  return viewerBlocks || targetBlocks;
}
