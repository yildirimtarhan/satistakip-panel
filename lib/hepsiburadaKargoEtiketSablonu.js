/**
 * Hepsiburada kargo teslim etiketi — yazdırılabilir HTML şablonu.
 * Kullanım: getKargoEtiketHtml(sipariş/paket verisi) → HTML string (yeni pencerede açılıp yazdırılır).
 *
 * Hepsiburada developer:
 * - Paket kargo bilgisi: GET /packages/merchantid/{merchantId}/packagenumber/{packagenumber}
 * - Ortak barkod: GET /packages/merchantid/{merchantId}/packagenumber/{packagenumber}/labels?format=...
 */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Object} data
 * @param {string} [data.orderNumber] - Sipariş numarası
 * @param {string} [data.packageNumber] - Paket numarası (HB)
 * @param {string} [data.trackingNumber] - Kargo takip no
 * @param {string} [data.trackingInfoUrl] - Takip URL (HB’den gelebilir)
 * @param {string} [data.cargoCompany] - Kargo firması adı
 * @param {string} [data.recipientName] - Alıcı adı
 * @param {string} [data.address] - Adres (sokak, no, vb.)
 * @param {string} [data.district] - İlçe
 * @param {string} [data.city] - İl
 * @param {string} [data.phone] - Telefon
 * @param {string} [data.senderName] - Gönderen (firma) adı
 */
export function getKargoEtiketHtml(data = {}) {
  const orderNumber = escapeHtml(data.orderNumber || data.packageNumber || "—");
  const packageNumber = escapeHtml(data.packageNumber || data.orderNumber || "—");
  const trackingNumber = escapeHtml(data.trackingNumber || data.trackingInfoCode || "");
  const trackingUrl = data.trackingInfoUrl || (trackingNumber ? `https://kargotakip.hepsiburada.com/?trackingNumber=${encodeURIComponent(trackingNumber)}` : "");
  const cargoCompany = escapeHtml(data.cargoCompany || "Hepsiburada Kargo");
  const recipientName = escapeHtml(data.recipientName || data.recipient || "Alıcı");
  const address = escapeHtml(data.address || data.shippingAddress?.address || "");
  const district = escapeHtml(data.district || data.shippingAddress?.district || "");
  const city = escapeHtml(data.city || data.shippingAddress?.city || "");
  const phone = escapeHtml(data.phone || data.shippingAddress?.phone || "");
  const senderName = escapeHtml(data.senderName || "Satıcı");

  const fullAddress = [address, district, city].filter(Boolean).join(", ");
  /* Resmi barkod için Hepsiburada API: GET /packages/merchantid/{merchantId}/packagenumber/{packagenumber}/labels?format=... */

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kargo etiketi - ${orderNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 12px; font-size: 12px; color: #111; }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
    .label { max-width: 100mm; min-height: 140mm; border: 1px solid #ccc; padding: 10px; }
    .label h1 { font-size: 14px; margin: 0 0 8px 0; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .row { margin-bottom: 6px; }
    .row strong { display: inline-block; width: 90px; }
    .recipient { font-size: 15px; font-weight: bold; margin: 10px 0 6px 0; }
    .address { font-size: 13px; line-height: 1.4; margin-bottom: 6px; }
    .tracking { font-size: 18px; font-family: monospace; letter-spacing: 2px; margin: 8px 0; word-break: break-all; }
    .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #999; font-size: 11px; color: #666; }
    .btn { display: inline-block; margin: 8px 8px 0 0; padding: 8px 14px; background: #F97316; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; }
    .btn:hover { background: #ea580c; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px;">
    <button type="button" class="btn" onclick="window.print();">Yazdır</button>
    <a href="${escapeHtml(trackingUrl) || "#"}" class="btn" target="_blank" rel="noopener">Kargo takip</a>
  </div>
  <div class="label">
    <h1>HEPSIBURADA KARGO ETİKETİ</h1>
    <div class="row"><strong>Sipariş no:</strong> ${orderNumber}</div>
    <div class="row"><strong>Paket no:</strong> ${packageNumber}</div>
    <div class="row"><strong>Kargo:</strong> ${cargoCompany}</div>
    <div class="recipient">${recipientName}</div>
    <div class="address">${fullAddress || "—"}${phone ? "<br>Tel: " + phone : ""}</div>
    ${trackingNumber ? `<div class="row"><strong>Takip no:</strong></div><div class="tracking">${trackingNumber}</div>` : ""}
    <div class="footer">Gönderen: ${senderName} | Hepsiburada siparişi</div>
  </div>
</body>
</html>`;
}
