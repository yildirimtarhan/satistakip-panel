import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixUpdateLaborCostAmount } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix işçilik bedeli gönderme (oms/{vendorId}/update-labor-cost-amount)
 * Body: { laborCostAmountItemRequests: [ { orderItemId, laborCostAmount } ] }
 * Sevkiyat "delivered" olana kadar gönderilebilir. laborCostAmount >= 0 ve item faturalandırılacak tutarından büyük olamaz.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
    });
  }

  const laborCostAmountItemRequests = req.body?.laborCostAmountItemRequests;
  if (!Array.isArray(laborCostAmountItemRequests) || laborCostAmountItemRequests.length === 0) {
    return res.status(400).json({
      success: false,
      message: "laborCostAmountItemRequests dizisi zorunludur ve en az bir kayıt (orderItemId, laborCostAmount) içermelidir.",
    });
  }

  try {
    const data = await idefixUpdateLaborCostAmount(creds, laborCostAmountItemRequests);
    return res.status(200).json({
      success: true,
      laborCostAmountItemRequests: data.laborCostAmountItemRequests ?? [],
      laborCostAmountData: data.laborCostAmountData ?? [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
