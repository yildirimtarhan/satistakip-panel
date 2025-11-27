// /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import N11Order from "@/models/N11Order";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    // 🔐 TOKEN KONTROLÜ
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 🌐 SOAP Body (Resmi N11 formatında)
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetOrderListRequest>
            <auth>
              <appKey>${process.env.N11_API_KEY}</appKey>
              <appSecret>${process.env.N11_API_SECRET}</appSecret>
            </auth>
            <status>-1</status>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>50</pageSize>
            </pagingData>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // 🌍 İstek
    const response = await axios.post(
      process.env.N11_BASE_URL,
      xmlRequest,
      { headers: { "Content-Type": "text/xml" } }
    );

    // 🧩 XML → JSON
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const orderList =
      parsed?.Envelope?.Body?.GetOrderListResponse?.orderList?.order || [];

    const orders = Array.isArray(orderList) ? orderList : [orderList];

    const client = await clientPromise;
    const db = client.db("satistakip");

    const savedOrders = [];

    for (let o of orders) {
      // 🧩 Buyer mapping (resmi dökümana uygun)
      const buyer = {
        fullName: o.buyer?.fullName || "",
        email: o.buyer?.email || "",
        gsm: o.buyer?.gsm || "",
        taxId: o.buyer?.taxId || "",
        taxOffice: o.buyer?.taxOffice || "",
      };

      // 🧩 Shipping Address
      const shippingAddress = {
        city: o.shippingAddress?.city || "",
        district: o.shippingAddress?.district || "",
        neighborhood: o.shippingAddress?.neighborhood || "",
        address: o.shippingAddress?.fullAddress?.address || "",
      };

      // 🧩 Items
      const itemsRaw = o.itemList?.item || [];
      const items = Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw];

      const normalizedItems = items.map((item) => ({
        id: item.id,
        sellerStockCode: item.sellerStockCode,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || item.amount || 0),
        status: item.status,
      }));

      // DB'ye yazılacak doc
      const doc = {
        orderNumber: o.id,
        buyer,
        shippingAddress,
        items: normalizedItems,
        orderStatus: o.orderStatus || "",
        itemStatus: o.itemStatus || "",
        totalPrice: Number(o.amount || 0),
        userId,
        raw: o,
      };

      // Duplicate kontrolü
      const existing = await db
        .collection("n11orders")
        .findOne({ orderNumber: doc.orderNumber, userId });

      if (!existing) {
        await db.collection("n11orders").insertOne(doc);
      }

      savedOrders.push(doc);
    }

    return res.status(200).json({
      success: true,
      orders: savedOrders,
    });

  } catch (err) {
    console.error("🔥 N11 Order Fetch Error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
