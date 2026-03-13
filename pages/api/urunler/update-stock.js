import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import jwt from "jsonwebtoken";
import { pushStockToMarketplaces } from "@/lib/pazaryeriStockSync";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId bulunamadı (token)" });
    }

    const { productId, quantity, type, note } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ message: "productId ve quantity zorunlu" });
    }

    // ✅ Multi-tenant güvenlik kontrolü
    const product = await Product.findOne({ _id: productId, companyId });

    if (!product) {
      return res
        .status(404)
        .json({ message: "Ürün bulunamadı (bu firmaya ait değil)" });
    }

    const q = Number(quantity);

    // ✅ DOĞRU ALAN: stock
    if (type === "in") {
      product.stock = Number(product.stock || 0) + q;
    } else {
      product.stock = Number(product.stock || 0) - q;
    }

    // stok negatif olmasın istersen:
    if (product.stock < 0) product.stock = 0;

    await product.save();

    // ✅ StockLog da companyId ile yazılsın
    await StockLog.create({
      companyId,
      productId,
      userId,
      type: type || "in",
      quantity: q,
      note: note || "",
      createdAt: new Date(),
    });

    pushStockToMarketplaces([productId], { companyId, userId });

    return res.status(200).json({
      message: "✅ Stok güncellendi",
      stock: product.stock,
    });
  } catch (err) {
    console.error("UPDATE STOCK ERROR:", err);
    return res.status(500).json({
      message: "Stok güncelleme hatası",
      error: err.message,
    });
  }
}
