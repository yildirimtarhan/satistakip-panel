// 📄 /models/Teklif.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function getTeklifCollection() {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const col = db.collection("teklifler");

  // 🔐 Index oluşturma (try/catch içinde, bir kereye mahsus)
  try {
    await Promise.all([
      col.createIndex({ number: 1 }, { unique: true }),
      col.createIndex({ cariId: 1 }),
      col.createIndex({ createdAt: -1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ validUntil: 1 }),
    ]);
  } catch (err) {
    console.warn("⚠️ Teklif index oluşturulamadı:", err.message);
  }

  return col;
}

// 🔢 Artan sayaç (yıla göre reset)
export async function getNextTeklifNumber() {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const counters = db.collection("counters");

  const year = new Date().getFullYear();
  const key = `teklif_${year}`;

  const result = await counters.findOneAndUpdate(
    { _id: key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { year, prefix: "TKL" },
    },
    {
      upsert: true,
      returnDocument: "after", // MongoDB v4.x ve sonrası için doğru param
    }
  );

  // Bazı durumlarda doc.value null döner, onu yakala
  const value = result?.value || { seq: 1, prefix: "TKL" };
  const seq = value.seq || 1;
  const prefix = value.prefix || "TKL";

  const number = `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
  return { number, year, seq };
}

/*
📘 Teklif kayıt yapısı (örnek)

{
  number: "TKL-2025-00001",
  year: 2025,
  seq: 1,
  cariId: ObjectId,
  cariAd: "ABC Ticaret",
  lines: [ { urunId, urunAd, adet, fiyat, kdv } ],
  note: "",
  logo: "data:image/png;base64...",
  totals: { araToplam, kdvToplam, genelToplam },
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
