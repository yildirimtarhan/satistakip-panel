// 📄 /pages/api/teklif/olustur.js
import { ObjectId } from "mongodb";
import { getTeklifCollection, getNextTeklifNumber } from "@/models/Teklif";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    // Sadece POST isteği kabul edilir
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Only POST" });
    }

    const {
      cariId,
      lines = [],
      note = "",
      logo = null,
      totals = null,
      validDays = 7,
    } = req.body || {};

    // 🧾 1️⃣ Temel doğrulamalar
    if (!cariId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "cariId ve en az 1 satır gerekli" });
    }

    // 🧩 2️⃣ MongoDB bağlantısı
    const client = await clientPromise;
    if (!client) {
      console.error("❌ MongoDB bağlantısı başarısız");
      return res.status(500).json({ message: "Veritabanı bağlantısı başarısız" });
    }

    const db = client.db("satistakip");
    const cariler = db.collection("accounts");

    // Cari kaydını getir
    let cari = null;
    try {
      cari = await cariler.findOne({ _id: new ObjectId(cariId) });
    } catch (err) {
      console.error("Cari ObjectId hatası:", err);
      return res.status(400).json({ message: "Geçersiz cariId formatı" });
    }

    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // 🔢 3️⃣ Teklif numarası oluştur
    let number, year, seq;
    try {
      const next = await getNextTeklifNumber();
      number = next.number;
      year = next.year;
      seq = next.seq;
    } catch (err) {
      console.warn("⚠️ getNextTeklifNumber hata:", err);
      const y = new Date().getFullYear();
      number = `T-${y}-0001`;
      year = y;
      seq = 1;
    }

    // 💰 4️⃣ Tutar hesaplamaları
    const araToplam =
      totals?.araToplam ??
      lines.reduce((t, l) => {
        const adet = Number(l.adet || 0);
        const fiyat = Number(l.fiyat || 0);
        return t + adet * fiyat;
      }, 0);

    const kdvToplam =
      totals?.kdvToplam ??
      lines.reduce((t, l) => {
        const adet = Number(l.adet || 0);
        const fiyat = Number(l.fiyat || 0);
        const kdv = Number(l.kdv || 0);
        const satirTutar = adet * fiyat;
        return t + (satirTutar * kdv) / 100;
      }, 0);

    const genelToplam = totals?.genelToplam ?? araToplam + kdvToplam;

    // 🕒 5️⃣ Tarihler
    const now = new Date();
    const validUntil = new Date(now.getTime() + (validDays || 7) * 24 * 60 * 60 * 1000);

    // 📦 6️⃣ Kayıt payload’u
    const payload = {
      number,
      year,
      seq,
      cariId: new ObjectId(cariId),
      cariAd: cari.ad || "",
      lines: lines.map((l) => ({
        urunAd: l.urunAd || "",
        adet: Number(l.adet || 0),
        fiyat: Number(l.fiyat || 0),
        kdv: Number(l.kdv || 0),
      })),
      note,
      logo,
      totals: { araToplam, kdvToplam, genelToplam },
      status: "Beklemede",
      approved: false,
      approvedAt: null,
      rejected: false,
      rejectedAt: null,
      sentAt: null,
      createdAt: now,
      validUntil,
    };

    // 💾 7️⃣ Veritabanına ekle
    const teklifler = await getTeklifCollection();
    if (!teklifler) {
      console.error("❌ getTeklifCollection null döndü");
      return res.status(500).json({ message: "Teklif koleksiyonu bulunamadı" });
    }

    const result = await teklifler.insertOne(payload);

    // 📨 8️⃣ Yanıt
    return res.status(201).json({
      message: "✅ Teklif başarıyla oluşturuldu",
      id: result.insertedId,
      offerNumber: number,
      year,
      seq,
      totals: payload.totals,
    });
  } catch (e) {
    console.error("❌ /api/teklif/olustur hata:", e);
    return res.status(500).json({ message: "Sunucu hatası", error: e.message || e.toString() });
  }
}
