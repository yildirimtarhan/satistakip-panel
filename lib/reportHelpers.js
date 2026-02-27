/**
 * Raporlar için tenant ve firma bilgisi helper'ı
 * Mevcut tenant.js üzerine kurulu
 */

import { getTenantFromRequest } from "./tenant";
import CompanySettings from "../models/CompanySettings";
import User from "../models/User";

/**
 * Request'ten tenant + firma bilgisi alır
 * @param {import('next').NextApiRequest} req
 * @returns {Promise<{
 *   userId: string,
 *   companyId: string,
 *   companyName: string,
 *   isAdmin: boolean,
 *   userRole: string,
 *   userName: string
 * }>}
 */
export async function getReportContext(req) {
  const tenant = getTenantFromRequest(req);
  
  if (!tenant) {
    throw new Error("Yetkilendirme hatası");
  }

  const { companyId, userId, isAdmin } = tenant;
  
  // Kullanıcı bilgisini al - Önce burada tanımla ki userRole erişilebilir olsun
  let userName = "Kullanıcı";
  let userRole = "user"; // ✅ BURADA TANIMLIYORUZ
  
  try {
    const user = await User.findById(userId).lean();
    if (user) {
      userName = `${user.ad || ""} ${user.soyad || ""}`.trim() || user.email;
      userRole = user.role || "user"; // ✅ ROLÜ ALIYORUZ
    }
  } catch (e) {
    console.error("Kullanıcı bilgisi alınamadı:", e);
  }

  // Firma adını al
  let companyName = "Bilinmiyor";
  try {
    const company = await CompanySettings.findOne({ 
      $or: [
        { companyId: companyId },
        { userId: userId }
      ]
    }).lean();
    
    if (company) {
      companyName = company.firmaAdi || "Adsız Firma";
    } else {
      // User'dan da kontrol et
      const user = await User.findById(userId).lean();
      if (user && user.firmaAdi) {
        companyName = user.firmaAdi;
      }
    }
  } catch (e) {
    console.error("Firma bilgisi alınamadı:", e);
  }

  return {
    userId,
    companyId,
    companyName,
    isAdmin,
    userRole, // ✅ ARTIK TANIMLI
    userName
  };
}

/**
 * MongoDB filtresi oluşturur (companyId bazlı)
 * @param {object} context - getReportContext sonucu
 * @param {object} additionalFilters - Ek filtreler (tarih, pazaryeri vb.)
 * @returns {object} MongoDB match objesi
 */
export function buildReportFilter(context, additionalFilters = {}) {
  const { companyId, isAdmin, userRole } = context;
  
  // Temel filtre: companyId (String olarak)
  const baseFilter = { companyId: companyId };
  
  // Admin özel filtresi (şimdilik yok, ileride eklenebilir)
  // if (isAdmin && someCondition) { ... }
  
  return {
    ...baseFilter,
    ...additionalFilters
  };
}

/**
 * Tarih filtresi oluşturur
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {object|null} { $gte: Date, $lte: Date } veya null
 */
export function buildDateFilter(startDate, endDate) {
  const filter = {};
  
  if (startDate) {
    filter.$gte = new Date(startDate + "T00:00:00.000Z");
  }
  if (endDate) {
    filter.$lte = new Date(endDate + "T23:59:59.999Z");
  }
  
  return Object.keys(filter).length > 0 ? filter : null;
}