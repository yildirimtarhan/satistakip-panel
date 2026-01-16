import jwt from "jsonwebtoken";
import dbConnect from "../../../lib/dbConnect";
import Teklif from "../../../models/Teklif";
import Cari from "../../../models/Cari";

function calcTotalsFromKalemler(kalemler = []) {
  let araToplam = 0;
  let kdvToplam = 0;

  for (const k of kalemler || []) {
    const adet = Number(k?.adet || 0);
    const birimFiyat = Number(k?.birimFiyat ?? 0);
    const kdvOrani = Number(k?.kdvOrani ?? 0);

    const satir = adet * birimFiyat;
    const kdv = (satir * kdvOrani) / 100;
    araToplam += satir;
    kdvToplam += kdv;
  }
  return { araToplam, kdvToplam, genelToplam: araToplam + kdvToplam };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filter = { userId: decoded.userId };
    if (req.query?.cariId) filter.cariId = req.query.cariId;

    const teklifler = await Teklif.find(filter).sort({ createdAt: -1 }).lean();

    // ✅ Backfill: cariUnvan + totals
    const enriched = await Promise.all(
      teklifler.map(async (t) => {
        const out = { ...t };

        // cariUnvan yoksa çek
        if (!out.cariUnvan && out.cariId) {
          const c = await Cari.findOne({ _id: out.cariId, userId: decoded.userId }).lean();
          out.cariUnvan = c?.unvan || c?.firmaAdi || c?.ad || c?.name || out.cariUnvan || "-";
        }

        // totals yoksa hesapla
        if (
          (out.genelToplam == null || Number(out.genelToplam) === 0) &&
          Array.isArray(out.kalemler) &&
          out.kalemler.length
        ) {
          const totals = calcTotalsFromKalemler(out.kalemler);
          out.araToplam = out.araToplam ?? totals.araToplam;
          out.kdvToplam = out.kdvToplam ?? totals.kdvToplam;
          out.genelToplam = out.genelToplam ?? totals.genelToplam;
        }

        return out;
      })
    );

    return res.status(200).json({
      teklifler: enriched,
      items: enriched,
    });
  } catch (err) {
    console.error("❌ /api/teklif/list hata:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
