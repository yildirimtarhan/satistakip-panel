/**
 * Trendyol Webhook Yönetimi
 * GET: Mevcut webhookları listele
 * POST: Yeni webhook oluştur
 * DELETE: Webhook sil (query: id)
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { webhooksUrl } from "@/lib/marketplaces/trendyolConfig";

function getWebhookBaseUrl() {
  const u =
    process.env.TRENDYOL_WEBHOOK_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    process.env.APP_URL ||
    "";
  return String(u).replace(/\/$/, "");
}

export default async function handler(req, res) {
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({
      success: false,
      message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol.",
    });
  }

  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";
  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    "User-Agent": userAgent,
  };
  const url = webhooksUrl(creds.supplierId);

  if (req.method === "GET") {
    try {
      const r = await fetch(url, { method: "GET", headers });
      const data = await r.json();
      if (!r.ok) {
        return res.status(r.status).json({ success: false, message: data?.message || "Webhook listesi alınamadı" });
      }
      const list = Array.isArray(data) ? data : (data?.webhooks || []);
      return res.status(200).json({ success: true, webhooks: list });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === "POST") {
    const baseUrl = getWebhookBaseUrl();
    const secret = process.env.TRENDYOL_WEBHOOK_SECRET || process.env.TRENDYOL_API_KEY;
    const errors = [];
    if (!baseUrl) errors.push("TRENDYOL_WEBHOOK_BASE_URL veya NEXTAUTH_URL tanımlı değil (webhook URL için).");
    if (!secret) errors.push("TRENDYOL_WEBHOOK_SECRET veya TRENDYOL_API_KEY tanımlı değil (webhook doğrulama için).");
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: errors.join(" "),
        hint: ".env.local'a ekleyin: TRENDYOL_WEBHOOK_BASE_URL=https://siteniz.com (veya NEXTAUTH_URL). Trendyol localhost kabul etmez.",
      });
    }

    const webhookUrl = `${baseUrl}/api/trendyol/webhook/orders`;

    const body = {
      url: webhookUrl,
      authenticationType: "API_KEY",
      apiKey: secret,
      subscribedStatuses: ["CREATED", "PICKING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"],
    };

    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) {
        return res.status(r.status).json({ success: false, message: data?.message || "Webhook oluşturulamadı", detail: data });
      }
      return res.status(200).json({
        success: true,
        webhookId: data?.id,
        url: webhookUrl,
        message: "Webhook başarıyla oluşturuldu.",
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Silinecek webhook id parametresi gerekli" });
    }
    try {
      const r = await fetch(`${url}/${id}`, { method: "DELETE", headers });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        return res.status(r.status).json({ success: false, message: data?.message || "Webhook silinemedi" });
      }
      return res.status(200).json({ success: true, message: "Webhook silindi." });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: "GET, POST, DELETE desteklenir" });
}
