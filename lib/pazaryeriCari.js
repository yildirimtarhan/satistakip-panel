/**
 * Pazaryeri muhasebe: Hepsiburada, N11, Trendyol, Pazarama için cari hesap bul/oluştur.
 * Bu carilerde platformun size borcu (pazaryeri_borc) takip edilir; tahsilat ile mahsup yapılır.
 */
import Cari from "@/models/Cari";

const PAZARYERI_TUR = "Pazaryeri";

/**
 * @param {string} ad - "Hepsiburada" | "N11" | "Trendyol" | "Pazarama"
 * @param {mongoose.Types.ObjectId} companyIdObj
 * @param {mongoose.Types.ObjectId} [userId]
 * @param {mongoose.ClientSession} [session] - N11 create-erp gibi transaction içinde kullanılıyorsa
 * @returns {Promise<{ cari: import("@/models/Cari"), created: boolean }>}
 */
export async function getOrCreatePazaryeriCari(ad, companyIdObj, userId, session = null) {
  const opts = session ? { session } : {};
  let cari = await Cari.findOne(
    {
      companyId: companyIdObj,
      ad,
      tur: PAZARYERI_TUR,
    },
    null,
    opts
  );
  if (cari) return { cari, created: false };
  const payload = {
    companyId: companyIdObj,
    ...(userId ? { userId } : {}),
    ad,
    tur: PAZARYERI_TUR,
  };
  if (session) {
    const arr = await Cari.create([payload], opts);
    cari = arr[0];
  } else {
    cari = await Cari.create(payload);
  }
  return { cari, created: true };
}

/**
 * Pazaryeri borç kaydı oluşturur ve carinin bakiyesini artırır.
 * @param {Object} params
 * @param {string} params.pazaryeriAd - "Hepsiburada" | "N11" | "Trendyol" | "Pazarama"
 * @param {mongoose.Types.ObjectId} params.companyIdObj
 * @param {string} params.companyIdStr
 * @param {string} params.userIdStr
 * @param {mongoose.Types.ObjectId} params.userIdObj - optional, cari için
 * @param {string} params.saleNo - örn. N11-123, HB-456
 * @param {number} params.totalTRY
 * @param {string} params.note - örn. "N11 sipariş 123"
 * @param {Date} [params.date]
 * @param {mongoose.ClientSession} [params.session]
 */
export async function createPazaryeriBorcAndUpdateBakiye({
  pazaryeriAd,
  companyIdObj,
  companyIdStr,
  userIdStr,
  userIdObj,
  saleNo,
  totalTRY,
  note,
  date = new Date(),
  session = null,
}) {
  const Transaction = (await import("@/models/Transaction")).default;
  const opts = session ? { session } : {};

  const { cari } = await getOrCreatePazaryeriCari(
    pazaryeriAd,
    companyIdObj,
    userIdObj || null,
    session
  );

  const txPayload = {
    userId: userIdStr,
    companyId: companyIdStr,
    accountId: cari._id,
    accountName: pazaryeriAd,
    type: "pazaryeri_borc",
    saleNo,
    date,
    paymentMethod: "open",
    note: note || `${pazaryeriAd} sipariş`,
    currency: "TRY",
    fxRate: 1,
    totalTRY,
    direction: "borc",
    amount: totalTRY,
  };

  if (session) {
    const arr = await Transaction.create([txPayload], opts);
    // bakiye güncelle
    cari.bakiye = Number(cari.bakiye || 0) + totalTRY;
    await cari.save(opts);
    return { cari, transaction: arr[0] };
  }

  await Transaction.create(txPayload);
  cari.bakiye = Number(cari.bakiye || 0) + totalTRY;
  await cari.save();
  return { cari };
}

/**
 * İptal/iade: Pazaryeri carisindeki ilgili sipariş borcunu geri alır (alacak yazar, bakiye düşer).
 * HB/N11 webhook iptal veya panelden satış iptali sonrası çağrılır.
 * @param {string} saleNo - örn. HB-123, N11-456
 * @param {string} companyIdStr
 * @param {string} pazaryeriAd - "Hepsiburada" | "N11" | "Trendyol" | "Pazarama"
 * @returns {Promise<{ ok: boolean, already?: boolean, message: string }>}
 */
export async function reversePazaryeriBorcBySaleNo(saleNo, companyIdStr, pazaryeriAd) {
  if (!saleNo || !companyIdStr || !pazaryeriAd) {
    return { ok: false, message: "saleNo, companyId ve pazaryeriAd gerekli" };
  }
  const Transaction = (await import("@/models/Transaction")).default;

  const borcTx = await Transaction.findOne({
    companyId: companyIdStr,
    type: "pazaryeri_borc",
    saleNo: String(saleNo),
    direction: "borc",
    isDeleted: { $ne: true },
  }).lean();

  if (!borcTx) {
    return { ok: false, message: "Pazaryeri borç kaydı bulunamadı (satış aktarılmamış olabilir)" };
  }

  const already = await Transaction.findOne({
    companyId: companyIdStr,
    type: "pazaryeri_borc_iptal",
    refSaleNo: String(saleNo),
    isDeleted: { $ne: true },
  }).lean();
  if (already) {
    return { ok: true, already: true, message: "Pazaryeri borcu zaten iptal edilmiş" };
  }

  const amount = Number(borcTx.totalTRY ?? borcTx.amount ?? 0) || 0;
  if (amount <= 0) return { ok: false, message: "Borç tutarı geçersiz" };

  const cari = await Cari.findById(borcTx.accountId);
  if (!cari) return { ok: false, message: "Pazaryeri carisi bulunamadı" };

  await Transaction.create({
    userId: borcTx.userId || null,
    companyId: companyIdStr,
    accountId: borcTx.accountId,
    accountName: pazaryeriAd,
    type: "pazaryeri_borc_iptal",
    refSaleNo: String(saleNo),
    saleNo: String(saleNo),
    date: new Date(),
    note: `${pazaryeriAd} sipariş iptal/iade (${saleNo})`,
    currency: "TRY",
    fxRate: 1,
    totalTRY: amount,
    direction: "alacak",
    amount,
  });

  cari.bakiye = Number(cari.bakiye || 0) - amount;
  await cari.save();

  return { ok: true, message: "Pazaryeri borcu iptal edildi" };
}
