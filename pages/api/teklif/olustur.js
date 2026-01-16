import jwt from "jsonwebtoken";
import dbConnect from "../../../lib/dbConnect";
import Teklif from "../../../models/Teklif";
import Cari from "../../../models/Cari";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // ✅ Front/Back uyumluluk: kalemler || lines
    const number = req.body?.number || req.body?.offerNumber;
    const cariId = req.body?.cariId;
    const paraBirimi = req.body?.paraBirimi || req.body?.currency || "TL";
    const not = req.body?.not || req.body?.note || "";
    const kalemler = req.body?.kalemler || req.body?.lines || [];

    if (!number) return res.status(400).json({ message: "Teklif numarası (number) gerekli" });
    if (!cariId) return res.status(400).json({ message: "Cari seçmelisiniz" });
    if (!Array.isArray(kalemler) || kalemler.length === 0) {
      return res.status(400).json({ message: "Ürün/Hizmet kalemleri boş olamaz" });
    }

    // ✅ Cari bilgisi (multi-tenant)
    const cari = await Cari.findOne({ _id: cariId, userId }).lean();
    if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

    const cariUnvan = cari.unvan || cari.firmaAdi || cari.ad || cari.name || "-";

    // ✅ Toplamları hesapla (server-side)
    let araToplam = 0;
    let kdvToplam = 0;

    const temizKalemler = kalemler.map((k) => {
      const adet = Number(k.adet || 0) > 0 ? Number(k.adet) : 1;
      const birimFiyat = Number(k.birimFiyat ?? k.fiyat ?? 0);
      const kdvOrani = Number(k.kdvOrani ?? k.kdv ?? 0);

      const satirTutar = adet * birimFiyat;
      const satirKdv = (satirTutar * kdvOrani) / 100;

      araToplam += satirTutar;
      kdvToplam += satirKdv;

      return {
        urunId: k.urunId,
        urunAdi: k.urunAdi || k.urunAd || "Ürün",
        adet,
        birimFiyat,
        kdvOrani,
        toplam: satirTutar + satirKdv,
      };
    });

    const genelToplam = araToplam + kdvToplam;

    // ✅ Teklif kaydı
    const teklif = await Teklif.create({
      userId,
      number,
      cariId,
      cariUnvan,
      paraBirimi,
      not,
      kalemler: temizKalemler,
      araToplam,
      kdvToplam,
      genelToplam,
      status: "kaydedildi",
    });

    return res.status(201).json({
      message: "✅ Teklif oluşturuldu",
      teklifId: teklif._id,
      teklif,
    });
  } catch (err) {
    console.error("❌ /api/teklif/olustur hata:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
