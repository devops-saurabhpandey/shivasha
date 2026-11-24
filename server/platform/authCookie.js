export const AUTH_COOKIE_NAME = "shivasha_sso";
export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getAuthCookieOptions(env = process.env) {
  const sameSite = ["strict", "lax", "none"].includes(String(env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase())
    ? String(env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase()
    : "lax";
  const secure = env.NODE_ENV === "production" || env.AUTH_COOKIE_SECURE === "true" || sameSite === "none";
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: AUTH_SESSION_TTL_MS,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {})
  };
}

export function clearAuthCookieOptions(env = process.env) {
  const { maxAge, ...options } = getAuthCookieOptions(env);
  return options;
}

export function parseCookieHeader(header = "") {
  return String(header).split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) return cookies;
    try { cookies[key] = decodeURIComponent(value); }
    catch { cookies[key] = value; }
    return cookies;
  }, {});
}

export function getRequestAuthToken(req) {
  const header = req.headers?.authorization || "";
  if (header.startsWith("Bearer ")) return { token: header.slice(7), source: "bearer" };
  const cookies = parseCookieHeader(req.headers?.cookie || "");
  return { token: cookies[AUTH_COOKIE_NAME] || null, source: "cookie" };
}

export function isAllowedBrowserOrigin(origin, env = process.env) {
  if (!origin) return false;
  const configured = String(env.FRONTEND_URL || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  const defaults = [
    "https://social.shivasha.com",
    "https://business.shivasha.com",
    "https://edutech.shivasha.com",
    "https://enterprise.shivasha.com"
  ];
  const allowed = configured.length ? configured : defaults;
  return allowed.includes(origin);
}

export function isUnsafeMethod(method = "GET") {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method).toUpperCase());
}

export function buildLoginResponsePayload({ ssoEnabled, token, user }) {
  return ssoEnabled
    ? { message: "Login successful", sso: true, user }
    : { message: "Login successful", token, user };
}
