// 📁 pages/api/efatura/kontor.js
// E-Fatura kontör: Taxten panelden + kullanım + alım listesi
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { getCreditBalance } from "@/lib/taxten/taxtenClient";
import { getKontorUsed } from "@/lib/efatura/kontorUsage";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userIdStr = String(decoded.userId || decoded._id || decoded.id || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    const tenantFilter = companyIdStr
      ? { companyId: companyIdStr }
      : { userId: userIdStr };

    const { db } = await connectToDatabase();

    // Firma ayarları (Taxten bilgisi için)
    const companyQuery = companyIdStr
      ? { $or: [{ companyId: companyIdStr }, { userId: userIdStr }] }
      : { userId: userIdStr };
    const settings = await db.collection("company_settings").findOne(companyQuery);

    // 1) Taxten panelden kontör çek (Taxten API varsa)
    let taxtenCredit = null;
    const hasTaxtenCreds = (settings?.taxtenUsername && settings?.taxtenPassword) ||
      (settings?.taxtenClientId && settings?.taxtenApiKey) ||
      (settings?.efatura?.taxtenClientId && settings?.efatura?.taxtenApiKey);
    if (hasTaxtenCreds && settings) {
      try {
        taxtenCredit = await getCreditBalance({
          company: settings,
          isTest: settings.taxtenTestMode !== false,
        });
      } catch (e) {
        console.warn("Taxten kontör API:", e?.message);
      }
    }

    // 2) Yerel kullanım: giden + gelen tüm belgeler (E-Fatura, E-Arşiv, E-İrsaliye)
    const used = await getKontorUsed(db, tenantFilter);

    // 3) Taxten'den gelen veri varsa öncelik ver
    let remaining = null;
    let loaded = null;
    let limit = null;
    let hasLimit = false;
    const fromTaxten = taxtenCredit && (taxtenCredit.remaining != null || taxtenCredit.total != null);

    if (fromTaxten) {
      remaining = taxtenCredit.remaining ?? (taxtenCredit.total != null && taxtenCredit.usage != null ? taxtenCredit.total - taxtenCredit.usage : null);
      loaded = taxtenCredit.loaded ?? taxtenCredit.total ?? null;
      limit = taxtenCredit.total ?? taxtenCredit.loaded ?? null;
      hasLimit = remaining != null || limit != null;
    } else {
      // Yerel limit: Admin limiti + eski kullanıcı alımları (manual, taxten_panel)
      const adminLimit = typeof settings?.efaturaKontorLimit === "number" && settings.efaturaKontorLimit >= 0
        ? settings.efaturaKontorLimit
        : 0;
      const purchaseSum = await db
        .collection("efatura_kontor_purchases")
        .aggregate([
          { $match: { ...tenantFilter, source: { $in: ["manual", "taxten_panel"] } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray();
      const userPurchaseTotal = purchaseSum[0]?.total ?? 0;
      const localLimit = adminLimit + userPurchaseTotal;
      hasLimit = localLimit > 0;
      limit = hasLimit ? localLimit : null;
      loaded = limit;
      remaining = hasLimit ? Math.max(0, localLimit - used) : null;
    }

    // 4) Kullanım listesi (giden + gelen tüm belgeler: E-Fatura, E-Arşiv, E-İrsaliye)
    const [sentList, incomingList, irsaliyeSentList, irsaliyeIncomingList] = await Promise.all([
      db.collection("efatura_sent").find({ ...tenantFilter, status: "sent" })
        .sort({ sentAt: -1 }).limit(20)
        .project({ invoiceNumber: 1, sentAt: 1, isEarsiv: 1, uuid: 1 })
        .toArray(),
      db.collection("efatura_incoming").find(tenantFilter)
        .sort({ receivedAt: -1, createdAt: -1 }).limit(20)
        .project({ invoiceNo: 1, faturaNo: 1, receivedAt: 1, senderTitle: 1 })
        .toArray(),
      db.collection("efatura_irsaliye_sent").find({ ...tenantFilter, status: "sent" })
        .sort({ sentAt: -1 }).limit(20)
        .project({ irsaliyeNo: 1, sentAt: 1, uuid: 1 })
        .toArray().catch(() => []),
      db.collection("efatura_irsaliye_incoming").find(tenantFilter)
        .sort({ receivedAt: -1 }).limit(20)
        .project({ irsaliyeNo: 1, receivedAt: 1 })
        .toArray().catch(() => []),
    ]);
    const usageList = [
      ...sentList.map((s) => ({ ...s, invoiceNumber: s.invoiceNumber, sentAt: s.sentAt, direction: "giden", type: s.isEarsiv ? "E-Arşiv" : "E-Fatura" })),
      ...incomingList.map((i) => ({
        invoiceNumber: i.invoiceNo || i.faturaNo,
        sentAt: i.receivedAt,
        type: "E-Fatura",
        direction: "gelen",
        senderTitle: i.senderTitle,
      })),
      ...(irsaliyeSentList || []).map((s) => ({
        invoiceNumber: s.irsaliyeNo,
        sentAt: s.sentAt,
        direction: "giden",
        type: "E-İrsaliye",
      })),
      ...(irsaliyeIncomingList || []).map((i) => ({
        invoiceNumber: i.irsaliyeNo,
        sentAt: i.receivedAt,
        direction: "gelen",
        type: "E-İrsaliye",
      })),
    ]
      .sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))
      .slice(0, 50);

    // 5) Alım listesi (kontör yüklemeleri)
    const purchaseList = await db
      .collection("efatura_kontor_purchases")
      .find(tenantFilter)
      .sort({ purchasedAt: -1 })
      .limit(50)
      .toArray();

    return res.status(200).json({
      used,
      limit,
      loaded,
      remaining,
      hasLimit,
      fromTaxten,
      taxtenCredit: fromTaxten ? taxtenCredit : null,
      usageList,
      purchaseList,
    });
  } catch (err) {
    console.error("E-Fatura Kontör API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
