export const MARKETPLACE_ORDER_STATUSES = ["Requested", "Accepted", "Declined", "Completed", "Cancelled"];

export function getMarketplaceOrderTransitionError({ currentStatus, nextStatus, actorId, buyerId, providerId, paymentStatus }) {
  if (!MARKETPLACE_ORDER_STATUSES.includes(nextStatus) || nextStatus === "Requested") {
    return "Invalid order status.";
  }

  const isBuyer = String(actorId) === String(buyerId);
  const isProvider = String(actorId) === String(providerId);
  if (!isBuyer && !isProvider) return "You are not allowed to update this order.";

  if (nextStatus === "Cancelled") {
    if (!isBuyer) return "Only the buyer can cancel this order.";
    if (["Paid", "Refunded"].includes(paymentStatus)) {
      return "Paid orders require an administrator refund review.";
    }
    if (!["Requested", "Accepted"].includes(currentStatus)) {
      return "This order can no longer be cancelled.";
    }
    return null;
  }

  if (!isProvider) return "Only the provider can update this order status.";
  const allowed = {
    Requested: ["Accepted", "Declined"],
    Accepted: ["Completed"],
    Declined: [],
    Completed: [],
    Cancelled: []
  };
  if (!allowed[currentStatus]?.includes(nextStatus)) {
    return "This order status transition is not allowed.";
  }
  if (["Paid", "Refunded"].includes(paymentStatus) && nextStatus !== "Completed") {
    return "Paid orders cannot be changed through the standard order workflow.";
  }
  return null;
}

export function normalizeMarketplacePaymentReference(value) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 120 ? normalized.toLowerCase() : "";
}
