// 📁 pages/api/admin/kontor.js
// Admin: Kullanıcı/Firma kontör listeleme ve ekleme
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { getKontorUsed } from "@/lib/efatura/kontorUsage";

const COL_PURCHASES = "efatura_kontor_purchases";
const COL_SETTINGS = "company_settings";

function ensureAdmin(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    res.status(401).json({ message: "Token eksik" });
    return null;
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ message: "Geçersiz token" });
    return null;
  }
  if (decoded.role !== "admin") {
    res.status(403).json({ message: "Bu işlem için admin yetkisi gerekir" });
    return null;
  }
  return decoded;
}

export default async function handler(req, res) {
  const decoded = ensureAdmin(req, res);
  if (!decoded) return;

  try {
    const { db } = await connectToDatabase();
    const purchasesCol = db.collection(COL_PURCHASES);
    const settingsCol = db.collection(COL_SETTINGS);

    // GET: Tüm kullanıcıların kontör listesi
    if (req.method === "GET") {
      const users = await User.find({}, "ad soyad email companyId _id")
        .sort({ createdAt: -1 })
        .lean();

      // Unique tenant'lar: companyId varsa companyId, yoksa userId
      const tenantMap = new Map(); // key: tenantId (companyId|userId), value: { users, displayName }
      for (const u of users) {
        const uid = String(u._id);
        const cid = u.companyId ? String(u.companyId) : null;
        const tenantId = cid || uid;
        const displayName = [u.ad, u.soyad].filter(Boolean).join(" ") || u.email || uid;

        if (!tenantMap.has(tenantId)) {
          tenantMap.set(tenantId, {
            tenantId,
            companyId: cid,
            userId: uid,
            displayName,
            emails: [],
          });
        }
        const t = tenantMap.get(tenantId);
        if (u.email && !t.emails.includes(u.email)) t.emails.push(u.email);
        if (displayName && t.displayName === uid) t.displayName = displayName;
      }

      const tenants = Array.from(tenantMap.values());
      const result = [];

      for (const t of tenants) {
        const tenantFilter = t.companyId
          ? { companyId: t.companyId }
          : { userId: t.userId };

        const [used, purchaseSumResult, settings] = await Promise.all([
          getKontorUsed(db, tenantFilter),
          purchasesCol
            .aggregate([{ $match: tenantFilter }, { $group: { _id: null, total: { $sum: "$amount" } } }])
            .toArray(),
          settingsCol.findOne(
            t.companyId
              ? { $or: [{ companyId: t.companyId }, { userId: t.userId }] }
              : { userId: t.userId }
          ),
        ]);

        const purchaseTotal = purchaseSumResult[0]?.total || 0;
        const limitFromSettings = settings?.efaturaKontorLimit;
        const limit =
          typeof limitFromSettings === "number" && limitFromSettings >= 0
            ? limitFromSettings
            : purchaseTotal > 0
            ? purchaseTotal
            : null;
        const hasLimit = limit != null;
        const remaining = hasLimit ? Math.max(0, limit - used) : null;

        result.push({
          tenantId: t.tenantId,
          companyId: t.companyId,
          userId: t.userId,
          displayName: t.displayName,
          email: t.emails[0] || "-",
          used,
          limit,
          purchaseTotal,
          remaining,
          hasLimit,
        });
      }

      return res.status(200).json({ tenants: result });
    }

    // POST: Kontör ekle
    if (req.method === "POST") {
      const { targetUserId, targetCompanyId, amount, note = "" } = req.body || {};
      const amt = parseInt(amount, 10);
      if (!amt || amt <= 0) {
        return res.status(400).json({ message: "Geçerli miktar girin" });
      }

      const companyIdStr = targetCompanyId ? String(targetCompanyId).trim() : null;
      const userIdStr = targetUserId ? String(targetUserId).trim() : null;

      if (!companyIdStr && !userIdStr) {
        return res.status(400).json({ message: "targetUserId veya targetCompanyId gerekli" });
      }

      const tenantFilter = companyIdStr
        ? { companyId: companyIdStr }
        : { userId: userIdStr };

      const settingsQuery = companyIdStr
        ? { $or: [{ companyId: companyIdStr }, { userId: userIdStr }] }
        : { userId: userIdStr };

      // 1) Purchase kaydı ekle
      await purchasesCol.insertOne({
        ...tenantFilter,
        amount: amt,
        note: String(note).trim() || "Admin tarafından eklendi",
        source: "admin",
        purchasedAt: new Date(),
        createdAt: new Date(),
      });

      // 2) company_settings varsa efaturaKontorLimit güncelle ($inc mantığı)
      // (Yoksa limit alımlar toplamından hesaplanır - kontor.js fallback)
      const settingsDoc = await settingsCol.findOne(settingsQuery);
      if (settingsDoc) {
        const current = settingsDoc.efaturaKontorLimit;
        const newVal = (typeof current === "number" ? current : 0) + amt;
        await settingsCol.updateOne(
          { _id: settingsDoc._id },
          { $set: { efaturaKontorLimit: newVal, updatedAt: new Date() } }
        );
      }

      return res.status(201).json({
        message: `${amt} kontör eklendi`,
        tenantFilter,
      });
    }

    return res.status(405).json({ message: "Sadece GET ve POST desteklenir" });
  } catch (err) {
    console.error("Admin Kontör API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
