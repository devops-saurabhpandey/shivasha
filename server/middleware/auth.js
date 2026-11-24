import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getRequestAuthToken, isAllowedBrowserOrigin, isUnsafeMethod } from "../platform/authCookie.js";

export async function requireAuth(req, res, next) {
  const { token, source } = getRequestAuthToken(req);
  if (!token) return res.status(401).json({ message: "Authentication required" });

  // Cookie-authenticated unsafe requests must originate from an explicitly
  // trusted frontend. Bearer-token clients keep their existing compatibility.
  if (source === "cookie" && isUnsafeMethod(req.method)) {
    const origin = req.headers.origin;
    if (!isAllowedBrowserOrigin(origin)) {
      return res.status(403).json({ message: "Untrusted request origin" });
    }
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    req.authMethod = source;
    const user = await User.findById(req.user.id).select("moderationBlocked");
    if (!user) return res.status(401).json({ message: "Account not found" });
    if (user.moderationBlocked) return res.status(403).json({ message: "This account is temporarily restricted" });
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
