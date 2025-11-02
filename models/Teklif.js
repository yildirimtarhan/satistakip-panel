// /models/Teklif.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function getTeklifCollection() {
  const client = await clientPromise;
  const db = client.db("satistakip");

  // ✨ Koleksiyon referansı
  const col = db.collection("teklifler");

  // ✨ Otomatik indexler (bir kere oluşur)
  // Durum, tarih ve numara bazlı hızlı filtreleme için
  await col.createIndex({ number: 1 }, { unique: true });
  await col.createIndex({ cariId: 1 });
  await col.createIndex({ createdAt: -1 });
  await col.createIndex({ status: 1 });
  await col.createIndex({ validUntil: 1 });

  return col;
}

// Artan sayaç (yıla göre reset)
export async function getNextTeklifNumber() {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const counters = db.collection("counters");
  const year = new Date().getFullYear();

  const doc = await counters.findOneAndUpdate(
    { _id: `teklif_${year}` },
    { $inc: { seq: 1 }, $setOnInsert: { year, prefix: "TKL" } },
    { upsert: true, returnDocument: "after" }
  );

  const seq = doc.value.seq;
  const prefix = doc.value.prefix || "TKL";
  const number = `${prefix}-${year}-${String(seq).padStart(5, "0")}`;

  return { number, year, seq };
}

/*
📌 Teklif kayıt yapısı (referans)

{
  number: "TKL-2025-00001",
  year: 2025,
  seq: 1,
  cariId: ObjectId,
  cariAd: "ABC Ticaret",
  lines: [ { urunId, urunAd, adet, fiyat, kdv } ],
  note: "",
  logo: "data:image/png;base64...", // opsiyonel
  totals: { araToplam, kdvToplam, genelToplam },

  // ✅ Durum alanları
  status: "Beklemede" | "Gönderildi" | "Onaylandı" | "Reddedildi",
  approved: false,
  approvedAt: null,
  rejected: false,
  rejectedAt: null,
  sentAt: null,

  createdAt: Date,
  validUntil: Date
}
*/
