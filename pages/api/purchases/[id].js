import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import Purchase from "@/models/Purchase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;
    const companyId = decoded.companyId || "";

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "ID gerekli" });
    }

    // 🔐 Multi-tenant güvenlik
    const filter = {
      _id: id,
      userId,
    };

    if (companyId) {
      filter.companyId = companyId;
    }

    const purchase = await Purchase.findOne(filter)
      .populate("accountId", "unvan")
      .populate("items.productId", "ad barkod sku")
      .lean();

    if (!purchase) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    res.status(200).json(purchase);
  } catch (err) {
    console.error("PURCHASE DETAIL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}
