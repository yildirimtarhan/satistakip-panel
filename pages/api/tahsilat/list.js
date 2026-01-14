import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;
    const tenantId = decoded.tenantId || decoded.companyId || decoded.firmaId;

    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    // ✅ Liste filtresi
    // B seçeneği: iptal edilenler de listede görünsün
    const match = {
      userId,
      accountId,
    };

    // ✅ multi-tenant varsa ekle (bozmuyoruz)
    if (tenantId) {
      match.tenantId = tenantId;
    }

    // ✅ sadece tahsilat/ödeme kayıtları gelsin (sale vb gelmesin)
    // Eğer senin sistemde type alanı farklıysa burayı genişletiriz
    match.type = { $in: ["tahsilat", "odeme", "payment", "collection", "tahsilat_cancel"] };

    const list = await Transaction.find(match).sort({ date: -1 }).lean();

    return res.json(list);
  } catch (err) {
    console.error("TAHSILAT LIST ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
