/**
 * Pazarama ürün gönderme
 * productId (ERP) veya product (link ile) + pazaramaOverride
 */
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaCreateProduct } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });

  try {
    await dbConnect();

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const creds = await getPazaramaCredentials(req);
    if (!creds?.apiKey || !creds?.apiSecret) {
      return res.status(400).json({ success: false, message: "Pazarama API bilgileri eksik. API Ayarları → Pazarama." });
    }

    const { productId, product: productPayload, pazaramaOverride } = req.body || {};
    let product;

    if (productPayload && typeof productPayload === "object" && (productPayload.name || productPayload.title)) {
      product = {
        name: productPayload.name || productPayload.title,
        title: productPayload.title || productPayload.name,
        description: productPayload.description || "",
        barcode: productPayload.barcode || productPayload.barkod || productPayload.sku,
        sku: productPayload.sku || productPayload.stockCode || productPayload.barcode,
        barkod: productPayload.barcode || productPayload.barkod,
        price: productPayload.price ?? productPayload.salePrice ?? 0,
        listPrice: productPayload.listPrice ?? productPayload.price,
        stock: productPayload.stock ?? productPayload.quantity ?? 0,
        images: productPayload.images || [],
        priceTl: productPayload.price ?? productPayload.priceTl ?? 0,
        discountPriceTl: productPayload.discountPriceTl ?? productPayload.price,
        vatRate: productPayload.vatRate ?? 20,
        marketplaceSettings: {
          pazarama: {
            categoryId: pazaramaOverride?.categoryId,
            brandId: pazaramaOverride?.brandId,
            attributes: pazaramaOverride?.attributes || [],
            vatRate: pazaramaOverride?.vatRate ?? 20,
            desi: pazaramaOverride?.desi ?? pazaramaOverride?.dimensionalWeight ?? 1,
            productCommercials: pazaramaOverride?.productCommercials,
            productCommercialAdditionalInfo: pazaramaOverride?.productCommercialAdditionalInfo,
            securityDescriptionIdList: pazaramaOverride?.securityDescriptionIdList,
            productBatchInfo: pazaramaOverride?.productBatchInfo,
            securityDocuments: pazaramaOverride?.securityDocuments,
            productSaleLimitQuantity: pazaramaOverride?.productSaleLimitQuantity,
          },
        },
      };
    } else if (productId) {
      const found = await Product.findOne({
        _id: productId,
        ...(companyId ? { $or: [{ companyId }, { userId }] } : { userId }),
      });
      if (!found) return res.status(404).json({ success: false, message: "Ürün bulunamadı" });
      product = found.toObject ? found.toObject() : { ...found };
      const pz = product.marketplaceSettings?.pazarama || {};
      product.marketplaceSettings = {
        ...product.marketplaceSettings,
        pazarama: {
          ...pz,
          categoryId: pazaramaOverride?.categoryId ?? pz.categoryId,
          brandId: pazaramaOverride?.brandId ?? pz.brandId,
          attributes: pazaramaOverride?.attributes ?? pz.attributes ?? [],
          vatRate: pazaramaOverride?.vatRate ?? pz.vatRate ?? 20,
          desi: pazaramaOverride?.desi ?? pz.desi ?? pz.dimensionalWeight ?? 1,
          productCommercials: pazaramaOverride?.productCommercials ?? pz.productCommercials,
          productCommercialAdditionalInfo: pazaramaOverride?.productCommercialAdditionalInfo ?? pz.productCommercialAdditionalInfo,
          securityDescriptionIdList: pazaramaOverride?.securityDescriptionIdList ?? pz.securityDescriptionIdList,
          productBatchInfo: pazaramaOverride?.productBatchInfo ?? pz.productBatchInfo,
          securityDocuments: pazaramaOverride?.securityDocuments ?? pz.securityDocuments,
          productSaleLimitQuantity: pazaramaOverride?.productSaleLimitQuantity ?? pz.productSaleLimitQuantity,
        },
      };
    } else {
      return res.status(400).json({ success: false, message: "productId veya product zorunlu" });
    }

    if (!product.marketplaceSettings?.pazarama?.categoryId || !product.marketplaceSettings?.pazarama?.brandId) {
      return res.status(400).json({ success: false, message: "Pazarama için kategori ve marka seçin." });
    }

    const result = await pazaramaCreateProduct(product, creds);
    return res.status(200).json({
      success: result.success,
      message: result.message,
      productId: result.productId,
      batchRequestId: result.productId,
    });
  } catch (err) {
    console.error("[Pazarama] Ürün oluşturma hatası:", err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.response?.data?.userMessage || err.message,
    });
  }
}
