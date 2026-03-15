/**
 * A5 (148×210 mm) kargo etiketi — satıcı, alıcı, adres, kargo bilgisi, kargo kampanya bilgisi.
 * PTT AVM ve Pazarama için profesyonel yazdırılabilir şablon.
 * @param {Object} data - { orderNumber, trackingNumber, trackingInfoUrl, cargoCompany, cargoCampaign, recipientName, address, district, city, phone, senderName, senderAddress, senderPhone, firmaAdi }
 * @param {{ marketplace?: 'pttavm'|'pazarama', title?: string }} options
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

export function getPazaryeriKargoEtiketA5Html(data = {}, options = {}) {
  const marketplace = options.marketplace || "pazaryeri";
  const title =
    options.title ||
    (marketplace === "pttavm" ? "PTT AVM KARGO ETİKETİ" : marketplace === "pazarama" ? "PAZARAMA KARGO ETİKETİ" : "KARGO ETİKETİ");

  const orderNumber = escapeHtml(data.orderNumber || data.packageNumber || "—");
  const trackingNumber = escapeHtml(data.trackingNumber || data.trackingInfoCode || "");
  const trackingUrl = data.trackingInfoUrl || (trackingNumber ? `https://www.ptt.gov.tr/Sayfalar/Takip.aspx?barkod=${encodeURIComponent(trackingNumber)}` : "");
  const cargoCompany = escapeHtml(data.cargoCompany || "Kargo");
  const cargoCampaign = escapeHtml(data.cargoCampaign || data.campaignInfo || "");
  const recipientName = escapeHtml(data.recipientName || data.recipient || "Alıcı");
  const address = escapeHtml(data.address || data.shippingAddress?.address || "");
  const district = escapeHtml(data.district || data.shippingAddress?.district || "");
  const city = escapeHtml(data.city || data.shippingAddress?.city || "");
  const phone = escapeHtml(data.phone || data.shippingAddress?.phone || "");
  const senderName = escapeHtml(data.senderName || "Satıcı");
  const senderAddress = escapeHtml(data.senderAddress || "");
  const senderPhone = escapeHtml(data.senderPhone || "");
  const firmaAdi = escapeHtml(data.firmaAdi || "");

  const fullAddress = [address, district, city].filter(Boolean).join(" / ");
  const senderBlock = [firmaAdi || senderName, senderAddress, senderPhone].filter(Boolean).join(" • ");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kargo etiketi - ${orderNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; margin: 0; padding: 10px; font-size: 12px; color: #1e293b; background: #f1f5f9; }
    @media print { body { padding: 0; background: #fff; } .no-print { display: none !important; } }
    @page { size: A5; margin: 10mm; }
    .a5 { width: 148mm; min-height: 210mm; max-width: 148mm; background: #fff; border: 2px solid #1e293b; padding: 8mm; position: relative; }
    .label-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid ${marketplace === "pttavm" ? "#c2410c" : "#0d9488"}; padding-bottom: 6px; margin-bottom: 8px; }
    .label-header h1 { font-size: 14px; margin: 0; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase; }
    .label-header .badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #0f172a; color: #fff; font-weight: 600; }
    .sender-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }
    .sender-section .title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
    .sender-section .content { font-size: 11px; line-height: 1.4; color: #334155; }
    .recipient-section { border: 3px solid #0f172a; border-radius: 8px; padding: 10px 12px; margin: 10px 0; background: linear-gradient(to bottom, #fffbeb 0%, #fef3c7 100%); }
    .recipient-section .title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #92400e; margin-bottom: 6px; letter-spacing: 0.5px; }
    .recipient-name { font-size: 16px; font-weight: 800; margin: 0 0 6px 0; color: #0f172a; }
    .recipient-address { font-size: 12px; line-height: 1.5; color: #334155; }
    .recipient-phone { font-size: 11px; margin-top: 4px; color: #475569; }
    .barcode-area { margin: 12px 0; padding: 10px; background: #fff; border: 2px dashed #94a3b8; border-radius: 6px; text-align: center; }
    .barcode-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .barcode-text { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; letter-spacing: 3px; word-break: break-all; color: #0f172a; }
    .cargo-section { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; padding-top: 8px; border-top: 2px solid #e2e8f0; }
    .cargo-item { flex: 1; min-width: 120px; }
    .cargo-item .key { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .cargo-item .val { font-size: 11px; font-weight: 600; color: #0f172a; }
    .campaign-box { margin-top: 10px; padding: 8px 10px; background: ${marketplace === "pttavm" ? "#fff7ed" : "#f0fdfa"}; border-radius: 6px; border-left: 4px solid ${marketplace === "pttavm" ? "#ea580c" : "#0d9488"}; font-size: 11px; color: #334155; }
    .footer { margin-top: 12px; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #64748b; text-align: center; }
    .btn { display: inline-block; margin: 6px 8px 0 0; padding: 10px 16px; background: ${marketplace === "pttavm" ? "#ea580c" : "#0d9488"}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; font-weight: 600; }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px;">
    <button type="button" class="btn" onclick="window.print();">🖨️ Yazdır (A5)</button>
    ${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}" class="btn" target="_blank" rel="noopener">📍 Kargo takip</a>` : ""}
  </div>
  <div class="a5">
    <div class="label-header">
      <h1>${title}</h1>
      <span class="badge">Sipariş: ${orderNumber}</span>
    </div>
    <div class="sender-section">
      <div class="title">Gönderici (Satıcı)</div>
      <div class="content">${senderBlock || senderName}</div>
    </div>
    <div class="recipient-section">
      <div class="title">Alıcı</div>
      <div class="recipient-name">${recipientName}</div>
      <div class="recipient-address">${fullAddress || "—"}</div>
      ${phone ? `<div class="recipient-phone">Tel: ${phone}</div>` : ""}
    </div>
    ${trackingNumber ? `<div class="barcode-area"><div class="barcode-label">Kargo takip no / Barkod</div><div class="barcode-text">${trackingNumber}</div></div>` : ""}
    <div class="cargo-section">
      <div class="cargo-item"><div class="key">Sipariş no</div><div class="val">${orderNumber}</div></div>
      <div class="cargo-item"><div class="key">Kargo firması</div><div class="val">${cargoCompany}</div></div>
    </div>
    ${cargoCampaign ? `<div class="campaign-box"><strong>Kampanya / Not:</strong> ${cargoCampaign}</div>` : ""}
    <div class="footer">${firmaAdi ? firmaAdi + " | " : ""}${orderNumber} | ${title}</div>
  </div>
</body>
</html>`;
}
