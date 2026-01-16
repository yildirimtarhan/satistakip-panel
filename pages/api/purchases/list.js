// /pages/api/purchases/list.js
import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";

import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";

function parseItemsFromNote(note = "") {
  try {
    const s = String(note || "");
    const idx = s.indexOf(ITEMS_MARKER);
    if (idx === -1) return [];

    const json = s.slice(idx + ITEMS_MARKER.length).trim();
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // ✅ AUTH
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token yok" });

    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded?.userId || decoded?.id || decoded?._id;
    if (!userId) return res.status(401).json({ message: "userId yok" });

    // ✅ sadece bu user'ın alışları (multi-tenant)
    const txs = await Transaction.find({
      userId,
      type: "purchase",
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Cari bilgisi
    const accountIds = txs.map((t) => String(t.accountId)).filter(Boolean);
    const cariler = await Cari.find({ _id: { $in: accountIds }, userId }).lean();
    const cariMap = new Map(cariler.map((c) => [String(c._id), c]));

    const list = txs.map((t) => {
      const items = parseItemsFromNote(t.note);
      const account = cariMap.get(String(t.accountId)) || null;

      return {
        _id: t._id,
        date: t.date || t.createdAt,
        accountId: account, // ✅ alislar.js buradan unvan okuyor
        description: t.note?.split("\n")?.[0] || "Alış",
        amount: Number(t.amount || 0),
        totalTRY: Number(t.totalTRY || 0),

        // ✅ EN KRİTİK FIX: frontend p.items bekliyor
        items: items.map((x) => ({
          productId: x.productId,
          quantity: Number(x.quantity || 0),
          unitPrice: Number(x.unitPrice || 0),
          currency: x.currency || "TRY",
          fxRate: Number(x.fxRate || 1),
          total: Number(x.total || 0),
        })),
      };
    });

    return res.status(200).json(list);
  } catch (err) {
    console.error("PURCHASE LIST ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
