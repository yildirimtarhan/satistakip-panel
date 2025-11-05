// pages/api/hepsiburada-api/orders/local.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("hb_orders");

    const docs = await col
      .find({})
      .sort({ fetchedAt: -1 })
      .limit(100)
      .toArray();

    const orders = docs.map((d) => ({
      orderNumber: d.data?.orderNumber || d.orderNumber,
      status: d.data?.status || d.data?.orderStatus || "-",
      updatedAt: d.data?.lastStatusUpdateDate || d.fetchedAt,
      raw: d.data
    }));

    return res.status(200).json({
      success: true,
      total: orders.length,
      orders
    });

  } catch (err) {
    console.error("HB → Local DB read error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
