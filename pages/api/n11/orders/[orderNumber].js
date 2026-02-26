// pages/api/n11/orders/[orderNumber].js
import { getToken } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";

export default async function handler(req, res) {
  const { orderNumber } = req.query;

  if (req.method === "GET") {
    return getOrderDetail(req, res, orderNumber);
  }

  if (req.method === "PUT") {
    return updateOrder(req, res, orderNumber);
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

async function getOrderDetail(req, res, orderNumber) {
  try {
    const user = await getToken(req);
    if (!user) return res.status(401).json({ success: false, message: "Yetkisiz" });

    await dbConnect();

    const order = await N11Order.findOne({ 
      orderNumber,
      companyId: user.companyId 
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Sipariş bulunamadı" });
    }

    // Cari bilgisini populate et (varsa)
    let cariInfo = null;
    if (order.accountId) {
      const Cari = require("@/models/Cari").default;
      const cari = await Cari.findById(order.accountId).lean();
      if (cari) {
        cariInfo = {
          id: cari._id.toString(),
          ad: cari.ad,
          telefon: cari.telefon,
          email: cari.email,
          adres: cari.adres
        };
      }
    }

    return res.json({
      success: true,
      order: {
        ...order,
        _id: order._id.toString(),
        cari: cariInfo
      }
    });

  } catch (error) {
    console.error("Get Order Detail Error:", error);
    return res.status(500).json({ success: false, message: "Hata oluştu" });
  }
}

async function updateOrder(req, res, orderNumber) {
  // Sipariş onaylama, kargo güncelleme vb.
  const { action, data } = req.body;

  try {
    const user = await getToken(req);
    if (!user) return res.status(401).json({ success: false, message: "Yetkisiz" });

    await dbConnect();

    if (action === "approve") {
      // N11 API'ye onay gönder
      // TODO: Implement SOAP call to update order status to Picking
      return res.json({ success: true, message: "Sipariş onaylandı" });
    }

    if (action === "shipment") {
      // Manuel kargo güncelleme
      const { shipmentCompany, trackingNumber } = data;
      
      await N11Order.findOneAndUpdate(
        { orderNumber },
        {
          $set: {
            "shipmentInfo.shipmentCompany.name": shipmentCompany,
            "shipmentInfo.trackingNumber": trackingNumber,
            status: "Shipped",
            updatedAt: new Date()
          }
        }
      );

      return res.json({ success: true, message: "Kargo bilgisi güncellendi" });
    }

    return res.status(400).json({ success: false, message: "Bilinmeyen aksiyon" });

  } catch (error) {
    console.error("Update Order Error:", error);
    return res.status(500).json({ success: false, message: "Güncelleme hatası" });
  }
}