/**
 * Pazaryeri ortak kargo etiketi — 10x15 cm (100x150 mm) profesyonel yazdırılabilir şablon.
 * Hepsiburada, N11, Trendyol için tek tip tasarım: gönderen, alıcı, takip no (barkod alanı), kargo firması.
 * @param {Object} data - { orderNumber, packageNumber, trackingNumber, trackingInfoUrl, cargoCompany, recipientName, address, district, city, phone, senderName, firmaAdi }
 * @param {{ marketplace?: 'hepsiburada'|'n11'|'trendyol', title?: string }} options
 * @returns {string} HTML
 */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getPazaryeriKargoEtiketHtml(data = {}, options = {}) {
  const marketplace = options.marketplace || "pazaryeri";
  const title = options.title || (marketplace === "hepsiburada" ? "HEPSIBURADA" : marketplace === "n11" ? "N11" : marketplace === "trendyol" ? "TRENDYOL" : "KARGO") + " KARGO ETİKETİ";

  const orderNumber = escapeHtml(data.orderNumber || data.packageNumber || "—");
  const packageNumber = escapeHtml(data.packageNumber || data.orderNumber || "—");
  const trackingNumber = escapeHtml(data.trackingNumber || data.trackingInfoCode || "");
  const trackingUrl = data.trackingInfoUrl || (trackingNumber ? `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}+kargo+takip` : "");
  const cargoCompany = escapeHtml(data.cargoCompany || "Kargo");
  const recipientName = escapeHtml(data.recipientName || data.recipient || "Alıcı");
  const address = escapeHtml(data.address || data.shippingAddress?.address || "");
  const district = escapeHtml(data.district || data.shippingAddress?.district || "");
  const city = escapeHtml(data.city || data.shippingAddress?.city || "");
  const phone = escapeHtml(data.phone || data.shippingAddress?.phone || "");
  const senderName = escapeHtml(data.senderName || "Satıcı");
  const firmaAdi = escapeHtml(data.firmaAdi || "");

  const fullAddress = [address, district, city].filter(Boolean).join(", ");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kargo etiketi - ${orderNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 8px; font-size: 11px; color: #111; background: #f1f5f9; }
    @media print { body { padding: 0; background: #fff; } .no-print { display: none !important; } }
    .label { width: 100mm; min-height: 150mm; max-width: 100mm; background: #fff; border: 2px solid #1e293b; padding: 6mm; position: relative; }
    .label-header { border-bottom: 3px solid #ea580c; padding-bottom: 4px; margin-bottom: 6px; }
    .label-header h1 { font-size: 10px; margin: 0; font-weight: 700; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase; }
    .row { margin-bottom: 3px; font-size: 10px; }
    .row strong { display: inline-block; width: 22mm; color: #475569; }
    .sender-block { background: #f8fafc; padding: 4px 6px; margin-bottom: 6px; border-radius: 4px; font-size: 9px; color: #475569; }
    .recipient-block { border: 2px solid #0f172a; padding: 6px 8px; margin: 6px 0; background: #fffbeb; }
    .recipient-name { font-size: 12px; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; }
    .recipient-address { font-size: 10px; line-height: 1.35; color: #334155; }
    .barcode-area { margin: 8px 0; padding: 6px; background: #fff; border: 1px dashed #94a3b8; text-align: center; min-height: 18mm; }
    .barcode-text { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; word-break: break-all; }
    .footer { margin-top: 8px; padding-top: 4px; border-top: 1px solid #cbd5e1; font-size: 8px; color: #64748b; }
    .btn { display: inline-block; margin: 6px 8px 0 0; padding: 8px 14px; background: #ea580c; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; text-decoration: none; }
    .btn:hover { background: #c2410c; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px;">
    <button type="button" class="btn" onclick="window.print();">🖨️ Yazdır</button>
    ${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}" class="btn" target="_blank" rel="noopener">📍 Kargo takip</a>` : ""}
  </div>
  <div class="label">
    <div class="label-header">
      <h1>${title}</h1>
    </div>
    <div class="sender-block">
      <strong>Gönderen:</strong> ${firmaAdi || senderName}
    </div>
    <div class="row"><strong>Sipariş no:</strong> ${orderNumber}</div>
    <div class="row"><strong>Paket no:</strong> ${packageNumber}</div>
    <div class="row"><strong>Kargo:</strong> ${cargoCompany}</div>
    <div class="recipient-block">
      <div class="recipient-name">${recipientName}</div>
      <div class="recipient-address">${fullAddress || "—"}${phone ? "<br>Tel: " + phone : ""}</div>
    </div>
    ${trackingNumber ? `<div class="barcode-area"><div class="row"><strong>Takip no:</strong></div><div class="barcode-text">${trackingNumber}</div></div>` : ""}
    <div class="footer">${firmaAdi ? firmaAdi + " | " : ""}${senderName} | ${orderNumber}</div>
  </div>
</body>
</html>`;
}
