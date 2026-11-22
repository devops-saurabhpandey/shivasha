/**
 * Revalidates the account behind a socket JWT, matching HTTP requireAuth.
 * Dependencies are injected to keep this policy unit-testable.
 */
export async function authenticateSocketUser({ token, jwtSecret, verifyToken, findUser }) {
  if (!token || !jwtSecret) return { ok: false, error: "Authentication required" };
  let claims;
  try {
    claims = verifyToken(token, jwtSecret);
  } catch {
    return { ok: false, error: "Invalid authentication token" };
  }
  if (!claims?.id) return { ok: false, error: "Invalid authentication token" };
  let user;
  try {
    user = await findUser(claims.id);
  } catch {
    return { ok: false, error: "Authentication unavailable" };
  }
  if (!user) return { ok: false, error: "Account not found" };
  if (user.moderationBlocked) return { ok: false, error: "This account is temporarily restricted" };
  return { ok: true, user: { ...claims, id: String(user._id || claims.id) } };
}
