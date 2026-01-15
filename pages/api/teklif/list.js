import jwt from "jsonwebtoken";
import dbConnect from "../../../lib/mongodb";
import Teklif from "../../../models/Teklif";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    await dbConnect();


    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("LIST decoded.userId =>", decoded.userId);

    const { cariId, status } = req.query;
    console.log("LIST USER:", decoded.userId);


    // ✅ filtre
    const filter = {
      userId: decoded.userId,
    };
    


    // ✅ status isterse filtrele, yoksa hepsini getir (kaydedildi/gonderildi/onaylandi...)
    if (status) {
      filter.status = status;
    }

    // ✅ cari seçildiyse filtrele
    if (cariId) {
      filter.cariId = cariId;
    }

    const teklifler = await Teklif.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ teklifler });
  } catch (err) {
    console.error("TEKLİF LIST ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
