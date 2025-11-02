// /pages/api/teklif/olustur.js
import { ObjectId } from "mongodb";
import { getTeklifCollection, getNextTeklifNumber } from "@/models/Teklif";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ message: "Only POST" });

    const {
      cariId,
      lines = [],
      note = "",
      logo = null,
      totals = null, 
      validDays = 7,
    } = req.body || {};

    if (!cariId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "cariId ve en az 1 satır gerekli" });
    }

    const client = await clientPromise;
    const db = client.db("satistakip");
    const cariler = db.collection("accounts");
    const cari = await cariler.findOne({ _id: new ObjectId(cariId) });
    if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

    const { number, year, seq } = await getNextTeklifNumber();

    const araToplam =
      totals?.araToplam ??
      lines.reduce((t, l) => t + Number(l.adet || 0) * Number(l.fiyat || 0), 0);

    const kdvToplam =
      totals?.kdvToplam ??
      lines.reduce((t, l) => {
        const s = Number(l.adet || 0) * Number(l.fiyat || 0);
        return t + (s * Number(l.kdv || 0)) / 100;
      }, 0);

    const genelToplam = totals?.genelToplam ?? (araToplam + kdvToplam);

    const now = new Date();
    const validUntil = new Date(now.getTime() + (validDays || 7) * 24 * 60 * 60 * 1000);

    const payload = {
      number, year, seq,
      cariId: new ObjectId(cariId),
      cariAd: cari.ad || "",
      lines,
      note,
      logo,
      totals: { araToplam, kdvToplam, genelToplam },
      status: "Beklemede",           // NEW: Teklif başlatıldı
      approved: false,               // NEW: Onay durumu
      approvedAt: null,              // NEW: Onay zamanı
      rejected: false,               // NEW: Reddedildi mi
      rejectedAt: null,              // NEW: Reddetme zamanı
      sentAt: null,                  // NEW: Mail gönderilme zamanı
      createdAt: now,
      validUntil,
    };

    const teklifler = await getTeklifCollection();
    const { insertedId } = await teklifler.insertOne(payload);

    return res.status(201).json({
      message: "Teklif oluşturuldu",
      id: insertedId,
      number,
      payload
    });

  } catch (e) {
    console.error("teklif/olustur error:", e);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
