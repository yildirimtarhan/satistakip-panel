// 📁 /pages/api/hepsiburada-api/catalog/sync.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = await db.collection("products").find({}).toArray();

    if (!products.length)
      return res.status(400).json({ success: false, message: "Gönderilecek ürün bulunamadı" });

    const hbAuth = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const results = [];

    for (const p of products) {
      // 🧱 Hepsiburada formatına uygun ürün payload
      const payload = {
        name: p.ad,
        brand: p.marka || "Markasız",
        barcode: p.barkod || "",
        categoryId: p.kategoriId || 6000001,
        attributes: [
          { attributeId: 12345, value: "Standart" },
        ],
        listPrice: p.satisFiyati,
        salePrice: p.satisFiyati,
        vatRate: p.kdvOrani || 20,
        stock: p.stok,
        cargoCompanyId: 1,
        desi: p.desi || 1,
      };

      try {
        const response = await fetch(
          "https://mpop-sit.hepsiburada.com/api/product/api/v1/listings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${hbAuth}`,
              "User-Agent": process.env.HB_USER_AGENT || "tigdes_dev",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        results.push({
          name: p.ad,
          status: response.status,
          ok: response.ok,
          result: data,
        });

        // 🔄 Başarılıysa ürün dokümanına kaydet
        if (response.ok && data?.data?.sku) {
          await db.collection("products").updateOne(
            { _id: p._id },
            {
              $set: {
                hbSku: data.data.sku,
                hbSyncDate: new Date(),
                hbResponse: data,
              },
            }
          );
        }
      } catch (err) {
        console.error("❌ Ürün gönderim hatası:", p.ad, err);
        results.push({
          name: p.ad,
          ok: false,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("🔥 HB Catalog Sync Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
