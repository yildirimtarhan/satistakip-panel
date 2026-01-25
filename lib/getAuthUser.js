// 📁 /lib/getAuthUser.js
import jwt from "jsonwebtoken";

/**
 * Token'ı önce Authorization Bearer'dan,
 * yoksa Cookie içinden alır ve decode eder.
 */
export function getTokenFromRequest(req) {
  // 1) Authorization: Bearer xxx
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) return token;
  }

  // 2) Cookie: token=xxx
  const cookieHeader = req.headers.cookie || "";
  const tokenCookie = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("token="));

  if (tokenCookie) {
    return tokenCookie.split("=")[1];
  }

  return null;
}

/**
 * JWT decode + verify
 */
export function getAuthUser(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // { userId, email, companyId, iat, exp }
  } catch (err) {
    return null;
  }
}
