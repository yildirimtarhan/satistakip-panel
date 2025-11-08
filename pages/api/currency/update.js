// 📁 /pages/api/currency/update.js
import clientPromise from "@/lib/mongodb"; // senin mevcut Mongo helper'ın
// Eğer yoksa, kendi Mongo bağlayıcını kullan (örn. mongoose bağlayıcın)

const DEFAULT_API = "https://api.exchangerate.host/latest?base=USD&symbols=TRY,EUR";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db(); // default db

    if (req.method === "GET") {
      // Son kaydı getir
      const last = await db.collection("fx_rates").find().sort({ createdAt: -1 }).limit(1).toArray();
      return res.status(200).json({ ok: true, data: last[0] || null });
    }

    if (req.method === "POST") {
      const apiUrl =
        process.env.CURRENCY_API_URL ||
        DEFAULT_API;
      const r = await fetch(apiUrl);
      if (!r.ok) {
        return res.status(502).json({ ok: false, message: "Kur servisinden yanıt alınamadı." });
      }
      const data = await r.json();

      // Beklenen yapı: { base: "USD", rates: { TRY: 32.10, EUR: 0.92 }, date: "2025-11-08", ... }
      const doc = {
        provider: apiUrl,
        base: data.base || "USD",
        date: data.date || new Date().toISOString().slice(0, 10),
        rates: data.rates || {},
        createdAt: new Date(),
      };
      await db.collection("fx_rates").insertOne(doc);
      return res.status(200).json({ ok: true, data: doc });
    }

    return res.status(405).json({ ok: false, message: "Sadece GET/POST" });
  } catch (e) {
    console.error("currency/update error:", e);
    return res.status(500).json({ ok: false, message: "Sunucu hatası", error: e.message });
  }
}
