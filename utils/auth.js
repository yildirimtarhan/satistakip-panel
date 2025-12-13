import jwt from "jsonwebtoken";

/**
 * Bearer token doğrulama
 * @param {string} token
 * @returns {object|null}
 */
export function verifyToken(token) {
  try {
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}
