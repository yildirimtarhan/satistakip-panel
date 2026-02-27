/**
 * Multi-tenant yardımcıları
 * Proje birden fazla firmaya satılacak; her kullanıcı sadece kendi firmasının (companyId) / kendi verisini (userId) görür.
 *
 * Kullanım:
 * - API'de token doğrula → getTenantFromRequest(req) veya getAuthUser(req)
 * - Liste/sorgu filtreleri için → getTenantFilter(decoded) veya getTenantFilterForList(decoded, { isAdminSeesAll: true })
 */

import mongoose from "mongoose";
import { getAuthUser } from "./getAuthUser";

/**
 * Token'dan tenant bilgisini döndürür. Token yoksa veya geçersizse null.
 * @param {import('next').NextApiRequest} req
 * @returns {{ companyId: string | null, userId: string | null, companyIdObj: mongoose.Types.ObjectId | null, userIdObj: mongoose.Types.ObjectId | null, isAdmin: boolean } | null}
 */
export function getTenantFromRequest(req) {
  const decoded = getAuthUser(req);
  if (!decoded) return null;

  const companyId = decoded.companyId ?? null;
  const userId = decoded.userId ?? decoded.id ?? decoded._id ?? null;
  const isAdmin = decoded.role === "admin" || decoded.isAdmin === true;

  const companyIdObj =
    companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : null;
  const userIdObj =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

  return {
    companyId: companyId ? String(companyId) : null,
    userId: userId ? String(userId) : null,
    companyIdObj,
    userIdObj,
    isAdmin,
  };
}

/**
 * Liste/sorgu için MongoDB filtre objesi üretir.
 * - Admin ise ve isAdminSeesAll true ise: boş obje (tüm veriler).
 * - companyId varsa: { companyId: ObjectId } (firma bazlı – aynı firmadaki herkes aynı veriyi görür).
 * - companyId yoksa: { userId: ObjectId } (kullanıcı bazlı).
 *
 * @param {object} decoded - JWT decode edilmiş payload (getAuthUser veya jwt.verify sonucu)
 * @param {{ isAdminSeesAll?: boolean }} options - isAdminSeesAll: true ise admin için boş filtre döner
 * @returns {{ companyId?: mongoose.Types.ObjectId, userId?: mongoose.Types.ObjectId }}
 */
export function getTenantFilter(decoded, options = {}) {
  const { isAdminSeesAll = false } = options;
  const isAdmin = decoded?.role === "admin" || decoded?.isAdmin === true;
  const companyId = decoded?.companyId ?? null;
  const userId = decoded?.userId ?? decoded?.id ?? decoded?._id ?? null;

  if (isAdmin && isAdminSeesAll) return {};

  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    return { companyId: new mongoose.Types.ObjectId(companyId) };
  }
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return { userId: new mongoose.Types.ObjectId(userId) };
  }

  return {};
}
