import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await dbConnect();

    /* ===============================
       🔐 AUTH
    =============================== */
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token yok" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, companyId } = decoded;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "CompanyId yok" });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Ürün ID yok" });
    }

    /* ===============================
       🧠 SAFE UPDATE PAYLOAD
    =============================== */
    const body = req.body || {};
    const updateData = {};

    // ❗ İzin verilen alanlar
    const allowedFields = [
      "title",
      "description",
      "sku",
      "barcode",
      "brand",
      "category",
      "images",
      "sendTo",
      "marketplaceSettings",
      "n11CategoryId",
      "n11BrandId",
      "n11SellerCode",
    ];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // ❌ ERP kritik alanları ASLA burada update edilmez
    delete updateData.stock;
    delete updateData.price;
    delete updateData.purchasePrice;
    delete updateData.salePrice;

    /* ===============================
       💾 DB UPDATE
    =============================== */
    const product = await Product.findOneAndUpdate(
      { _id: id, companyId },
      { $set: updateData },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı" });
    }

    return res.json({ success: true, product });
  } catch (err) {
    console.error("PRODUCT UPDATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
