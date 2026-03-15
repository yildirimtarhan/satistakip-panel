/**
 * E-Belge Kontör Kullanımı
 * Her belge (E-Fatura, E-Arşiv, E-İrsaliye - gelen ve giden) 1 kontör düşer.
 */

const COLLECTIONS = [
  { col: "efatura_sent", filter: (f) => ({ ...f, status: "sent" }) },
  { col: "efatura_incoming", filter: (f) => f },
  { col: "efatura_irsaliye_sent", filter: (f) => ({ ...f, status: "sent" }) },
  { col: "efatura_irsaliye_incoming", filter: (f) => f },
];

/**
 * Tenant için toplam kontör kullanımını hesapla
 * Giden + gelen tüm belgeler (E-Fatura, E-Arşiv, E-İrsaliye)
 * @param {Object} db - MongoDB db instance
 * @param {Object} tenantFilter - { companyId } veya { userId }
 * @returns {Promise<number>}
 */
export async function getKontorUsed(db, tenantFilter) {
  let total = 0;
  for (const { col, filter } of COLLECTIONS) {
    try {
      const n = await db.collection(col).countDocuments(filter(tenantFilter));
      total += n;
    } catch {
      // Koleksiyon yoksa 0 say
    }
  }
  return total;
}
