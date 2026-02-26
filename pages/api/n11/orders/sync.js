// pages/api/n11/orders/sync.js
import axios from "axios";
import { getToken } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import { parseStringPromise } from "xml2js";

const N11_API_URL = "https://api.n11.com/ws/OrderService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const user = await getToken(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Yetkisiz erişim" });
    }

    const { startDate, endDate, status = "Created" } = req.body;

    // N11 SOAP API çağrısı
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({ 
        success: false, 
        message: "N11 API anahtarları eksik" 
      });
    }

    const xml = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:DetailedOrderListRequest>
          <auth>
            <appKey>${appKey}</appKey>
            <appSecret>${appSecret}</appSecret>
          </auth>
          <pagingData>
            <currentPage>0</currentPage>
            <pageSize>100</pageSize>
          </pagingData>
          <searchData>
            ${status ? `<status>${status}</status>` : ''}
            ${startDate ? `<startDate>${startDate}</startDate>` : ''}
            ${endDate ? `<endDate>${endDate}</endDate>` : ''}
          </searchData>
        </sch:DetailedOrderListRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;

    const { data: xmlResponse } = await axios.post(N11_API_URL, xml, {
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
      timeout: 30000
    });

    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    
    // Parse SOAP response (mevcut kodunuzdan alındı, düzenlendi)
    const envelope = parsed?.["SOAP-ENV:Envelope"] || parsed?.["soapenv:Envelope"] || parsed?.Envelope;
    const body = envelope?.["SOAP-ENV:Body"] || envelope?.["soapenv:Body"] || envelope?.Body;
    const response = body?.["ns3:DetailedOrderListResponse"] || body?.DetailedOrderListResponse;
    
    let orders = response?.orderList?.order;
    if (!orders) {
      return res.json({ success: true, message: "Yeni sipariş bulunamadı", count: 0 });
    }

    orders = Array.isArray(orders) ? orders : [orders];

    await dbConnect();

    let savedCount = 0;
    let updatedCount = 0;

    for (const rawOrder of orders) {
      const orderData = transformN11Order(rawOrder);
      
      // Upsert order
      const result = await N11Order.findOneAndUpdate(
        { orderNumber: orderData.orderNumber },
        { 
          $set: {
            ...orderData,
            companyId: user.companyId,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        savedCount++;
      } else {
        updatedCount++;
      }
    }

    return res.json({
      success: true,
      message: `${savedCount} yeni, ${updatedCount} güncellenmiş sipariş`,
      saved: savedCount,
      updated: updatedCount,
      total: orders.length
    });

  } catch (error) {
    console.error("N11 Sync Error:", error);
    return res.status(500).json({
      success: false,
      message: "Senkronizasyon hatası",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}

function transformN11Order(raw) {
  const items = normalizeItems(raw.orderItemList?.orderItem);
  
  return {
    orderNumber: raw.orderNumber,
    status: raw.status,
    buyer: {
      fullName: raw.buyer?.fullName || raw.recipient || "",
      email: raw.buyer?.email || "",
      gsm: raw.buyer?.gsm || ""
    },
    shippingAddress: raw.shippingAddress || raw.deliveryAddress || {},
    billingAddress: raw.billingAddress || {},
    items: items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName || item.title || "N11 Ürünü",
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      sellerInvoiceAmount: Number(item.sellerInvoiceAmount || 0),
      totalMallDiscountPrice: Number(item.totalMallDiscountPrice || 0),
      productSellerCode: item.productSellerCode,
      status: item.status,
      shipmentInfo: item.shipmentInfo || {}
    })),
    totalPrice: Number(raw.totalAmount || 0),
    currencyType: raw.currencyType || "TL",
    shipmentInfo: {
      shipmentCompany: raw.shipmentInfo?.shipmentCompany || {},
      trackingNumber: raw.shipmentInfo?.trackingNumber,
      campaignNumber: raw.shipmentInfo?.campaignNumber
    },
    raw: raw // Ham veriyi de sakla
  };
}

function normalizeItems(items) {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}