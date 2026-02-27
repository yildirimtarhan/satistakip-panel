"use client";

import React, { useRef } from "react";

/**
 * N11 tarzı kargo etiketi: A5 boyut, üstte Satış Takip Online, altta n11, gönderici firma bilgileri.
 * "Çıktı Al" ile A5 olarak yazdırılır.
 */
export function ShippingLabelModal({
  open,
  onClose,
  sender = {},
  recipient = {},
  orderNumber = "",
  cargoCompany = "",
  paymentType = "",
  items = [],
  campaignCode = "",
}) {
  const printRef = useRef(null);

  const senderName = sender.companyName || sender.firmaAdi || "—";
  const senderPhone = sender.phone || sender.telefon || "—";
  const senderAddress = sender.address || sender.adres || "—";
  const recipientName = recipient.name || recipient.fullName || "—";
  const recipientAddress = recipient.address || recipient.fullAddress || "—";
  const recipientDistrict = recipient.district || "—";
  const recipientCity = recipient.city || "—";
  const recipientPostalCode = recipient.postalCode || "—";
  const recipientPhone = recipient.phone || recipient.gsm || "—";
  const campaignDisplay = campaignCode || orderNumber || "";

  const buildPrintHtml = () => {
    const rows = (items || []).map((it) => `<tr><td>${(it.productName || it.name || "—").replace(/</g, "&lt;")} / Ad:${Number(it.quantity) || 1}</td></tr>`).join("");
    return `
    <div class="a5-sheet">
      <div class="label-header">
        <div class="brand">Satış Takip Online</div>
        <div class="brand-sub">Kargo Etiketi</div>
      </div>
      <div class="section">
        <div class="section-title">Gönderici Bilgileri</div>
        <p><span class="label">Şirket:</span> ${String(senderName).replace(/</g, "&lt;")}</p>
        <p><span class="label">Tel:</span> ${String(senderPhone).replace(/</g, "&lt;")}</p>
        <p><span class="label">Adres:</span> ${String(senderAddress).replace(/</g, "&lt;")}</p>
        <p class="print-date">${new Date().toLocaleDateString("tr-TR", { dateStyle: "medium" })}</p>
      </div>
      <div class="section">
        <div class="section-title">Alıcı Bilgileri</div>
        <p><span class="label">Ad/Soyad:</span> ${String(recipientName).replace(/</g, "&lt;")}</p>
        <p><span class="label">Adres:</span> ${String(recipientAddress).replace(/</g, "&lt;")}</p>
        <p><span class="label">Semt:</span> ${String(recipientDistrict).replace(/</g, "&lt;")} <span class="label">Şehir:</span> ${String(recipientCity).replace(/</g, "&lt;")} <span class="label">PK:</span> ${String(recipientPostalCode).replace(/</g, "&lt;")}</p>
        <p><span class="label">Telefon:</span> ${String(recipientPhone).replace(/</g, "&lt;")}</p>
        <p><span class="label">Ödeme:</span> ${String(paymentType || "—").replace(/</g, "&lt;")}</p>
      </div>
      <div class="section">
        <div class="section-title">Sipariş Bilgileri</div>
        <p><span class="label">Sipariş No:</span> ${String(orderNumber).replace(/</g, "&lt;")}</p>
        <p><span class="label">Kargo:</span> ${String(cargoCompany || "—").replace(/</g, "&lt;")} <span class="label">Ödeme:</span> ${String(paymentType || "—").replace(/</g, "&lt;")}</p>
      </div>
      <div class="section">
        <div class="section-title">Ürün Listesi</div>
        <table><thead><tr><th>Ürün Adı / Adet</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
      ${campaignDisplay ? `
      <div class="section">
        <div class="section-title">Kampanya Kodu</div>
        <div class="barcode-wrap">${String(campaignDisplay).replace(/</g, "&lt;")}</div>
        <p class="barcode-note">Kampanya kodunun hata vermesi durumunda çıkış yapmayınız, gönderici firma ile irtibata geçiniz.</p>
      </div>
      ` : ""}
      <div class="label-footer">
        <div class="n11-logo">n11</div>
        <div class="n11-name">n11.com · Alışverişte Güven</div>
      </div>
    </div>`;
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kargo Etiketi - ${String(orderNumber).replace(/</g, "&lt;")}</title>
          <meta charset="utf-8">
          <style>
            @page { size: A5; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .a5-sheet { width: 148mm; min-height: 210mm; max-width: 148mm; margin: 0 auto; padding: 8mm; box-sizing: border-box; }
            .label-header { text-align: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 2px solid #1a365d; }
            .label-header .brand { font-size: 18px; font-weight: 700; color: #1a365d; letter-spacing: 0.5px; }
            .label-header .brand-sub { font-size: 10px; color: #4a5568; margin-top: 2px; }
            .label-footer { text-align: center; padding-top: 12px; margin-top: 12px; border-top: 2px solid #ff6600; }
            .label-footer .n11-logo { font-size: 22px; font-weight: 800; color: #ff6600; letter-spacing: -1px; }
            .label-footer .n11-name { font-size: 10px; color: #718096; margin-top: 2px; }
            .section { margin-bottom: 10px; }
            .section-title { font-size: 12px; font-weight: 700; color: #2d3748; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
            .section p { margin: 3px 0; line-height: 1.35; }
            .section .label { font-weight: 600; color: #4a5568; }
            .barcode-wrap { text-align: center; margin: 10px 0; padding: 8px; background: #f7fafc; border: 1px solid #e2e8f0; font-family: monospace; font-size: 16px; letter-spacing: 2px; }
            .barcode-note { font-size: 9px; color: #718096; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
            th, td { text-align: left; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
            .print-date { font-size: 10px; color: #718096; }
          </style>
        </head>
        <body>${buildPrintHtml()}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[180mm] max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Kargo Etiketi (A5)</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium"
            >
              Çıktı Al
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm"
            >
              Kapat
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto flex-1 flex justify-center bg-gray-100">
          {/* A5 önizleme: 148mm x 210mm */}
          <div
            ref={printRef}
            className="label-content bg-white text-gray-800 shadow-inner"
            style={{ width: "148mm", minHeight: "210mm", padding: "8mm", boxSizing: "border-box" }}
          >
            {/* Üst: Satış Takip Online */}
            <div className="text-center pb-3 mb-3 border-b-2 border-indigo-900">
              <div className="text-lg font-bold text-indigo-900 tracking-wide">Satış Takip Online</div>
              <div className="text-xs text-gray-500 mt-0.5">Kargo Etiketi</div>
            </div>

            {/* Gönderici Firma Bilgileri */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">Gönderici Bilgileri</h3>
              <p className="text-sm"><span className="font-semibold text-gray-600">Şirket:</span> {senderName}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Tel:</span> {senderPhone}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Adres:</span> {senderAddress}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString("tr-TR", { dateStyle: "medium" })}</p>
            </div>

            {/* Alıcı Bilgileri */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">Alıcı Bilgileri</h3>
              <p className="text-sm"><span className="font-semibold text-gray-600">Ad/Soyad:</span> {recipientName}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Adres:</span> {recipientAddress}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Semt:</span> {recipientDistrict} <span className="font-semibold text-gray-600">Şehir:</span> {recipientCity} <span className="font-semibold text-gray-600">PK:</span> {recipientPostalCode}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Telefon:</span> {recipientPhone}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Ödeme:</span> {paymentType || "—"}</p>
            </div>

            {/* Sipariş Bilgileri */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">Sipariş Bilgileri</h3>
              <p className="text-sm"><span className="font-semibold text-gray-600">Sipariş No:</span> {orderNumber}</p>
              <p className="text-sm"><span className="font-semibold text-gray-600">Kargo:</span> {cargoCompany || "—"} <span className="font-semibold text-gray-600">Ödeme:</span> {paymentType || "—"}</p>
            </div>

            {/* Ürün Listesi */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">Ürün Listesi</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th>Ürün Adı / Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {(items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName || item.name || "—"} / Ad:{Number(item.quantity) || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kampanya Kodu */}
            {(campaignCode || orderNumber) && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">Kampanya Kodu</h3>
                <div className="text-center py-2 bg-gray-50 border border-gray-200 rounded font-mono text-base tracking-widest">
                  {campaignCode || orderNumber}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Kampanya kodunun hata vermesi durumunda çıkış yapmayınız, gönderici firma ile irtibata geçiniz.</p>
              </div>
            )}

            {/* Alt: n11 logosu ve adı */}
            <div className="text-center pt-4 mt-4 border-t-2 border-orange-500">
              <div className="text-2xl font-extrabold text-orange-500 tracking-tight">n11</div>
              <div className="text-xs text-gray-500 mt-0.5">n11.com · Alışverişte Güven</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
