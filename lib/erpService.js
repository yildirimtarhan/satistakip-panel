// 📁 /lib/erpService.js
import axios from "axios";

export async function pushOrderToERP(order) {
  try {
    const response = await axios.post(
      process.env.ERP_BASE_URL + "/orders",
      {
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        items: order.items,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ERP_API_TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("🔥 ERP Push Error:", err.response?.data || err.message);
    throw new Error("ERP push failed");
  }
}