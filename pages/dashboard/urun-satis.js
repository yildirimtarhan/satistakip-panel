// 📄 /pages/dashboard/urun-satis.js
"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";

/**
 * Para formatı (TRY gibi)
 */
const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ──────────────────────────────────────────────
   jsPDF + autoTable (dinamik import, Roboto destekli)
───────────────────────────────────────────────*/

// Dinamik jsPDF + autoTable import (SSR hatalarını önler)
async function makeJsPDF() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

// Roboto fontlarını base64’e çevir
async function loadFontBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

// jsPDF’e Roboto ekler; yoksa Helvetica
async function ensureRoboto(doc) {
  const regularB64 = await loadFontBase64("/fonts/Roboto-Regular.ttf");
  const boldB64 = await loadFontBase64("/fonts/Roboto-Bold.ttf");

  if (regularB64) {
    doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  }
  if (boldB64) {
    doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  }

  const hasRoboto = !!regularB64;
  const setFont = (style = "normal") => {
    if (hasRoboto) doc.setFont("Roboto", style);
    else doc.setFont("helvetica", style);
  };
  return { hasRoboto, setFont };
}

/* ──────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────*/

export default function Satislar() {
  const [loading, setLoading] = useState(true);
  const [satislar, setSatislar] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [token, setToken] = useState("");

  // Detay Modal state
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);

    if (t) loadSales(t);
  }, []);

  /**
   * 🔹 Satış kayıtlarını çek
   * /api/cari/transactions içinden type: "sale" olanlar listelenir.
   * BE tarafında şuna benzer bir kayıt yapman gerekiyor:
   * {
   *   type: "sale",
   *   saleNo: "S-2025-0001",
   *   accountId,
   *   customerName,
   *   date,
   *   invoiceNo,
   *   orderNo,
   *   currency: "TRY",
   *   totalTRY,
   *   lines: [ { productName, quantity, unitPrice, kdv, currency, totalLineTRY }, ... ]
   * }
   */
  const loadSales = async (token) => {
    try {
      setLoading(true);

      const res = await fetch("/api/cari/transactions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Satış listesi alınamadı.");

      const data = await res.json();

      // Sadece satış işlemleri
      const saleList = (data || []).filter((t) => t.type === "sale");

      // Tarihe göre yeni → eski sıralama
      saleList.sort(
        (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      );

      setSatislar(saleList);
      setFiltered(saleList);
    } catch (err) {
      console.error("Satış listesi hata:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔍 Filtreleme & Arama
   */
  useEffect(() => {
    let list = [...satislar];

    if (search.trim() !== "") {
      const s = search.toLowerCase();
      list = list.filter((item) => {
        const saleNo = (item.saleNo || "").toLowerCase();
        const invoiceNo = (item.invoiceNo || "").toLowerCase();
        const orderNo = (item.orderNo || "").toLowerCase();
        const customerName =
          (item.customerName || item.accountName || "").toLowerCase();

        return (
          saleNo.includes(s) ||
          invoiceNo.includes(s) ||
          orderNo.includes(s) ||
          customerName.includes(s)
        );
      });
    }

    if (date) {
      list = list.filter((item) => {
        const d = item.date || item.invoiceDate || item.createdAt;
        if (!d) return false;
        return String(d).slice(0, 10) === date;
      });
    }

    setFiltered(list);
  }, [search, date, satislar]);
  /**
   * 📊 Toplamlar (rapor üst bilgisi)
   */
  const totalCount = filtered.length;
  const totalAmount = filtered.reduce(
    (sum, s) => sum + Number(s.totalTRY || 0),
    0
  );

  /**
   * 🧾 PDF – tek satış için fiş
   */
  const pdfYazdir = async (sale) => {
    try {
      const { jsPDF, autoTable } = await makeJsPDF();
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
        orientation: "portrait",
      });
      const { setFont } = await ensureRoboto(doc);

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Başlık
      setFont("bold");
      doc.setFontSize(18);
      doc.text("SATIŞ FİŞİ", pageW / 2, 40, { align: "center" });

      setFont("normal");
      doc.setFontSize(10);

      const tarih = sale.date
        ? new Date(sale.date).toLocaleDateString("tr-TR")
        : "-";

      const musteri =
        sale.customerName || sale.accountName || sale.cariAd || "Müşteri";

      // Sol üst: satış bilgileri
      doc.text(`Satış No: ${sale.saleNo || "-"}`, 40, 70);
      doc.text(`Tarih   : ${tarih}`, 40, 86);
      doc.text(`Fatura No: ${sale.invoiceNo || "-"}`, 40, 102);
      doc.text(`Sipariş No: ${sale.orderNo || "-"}`, 40, 118);

      // Sağ üst: müşteri
      doc.text(`Müşteri: ${musteri}`, pageW - 40, 70, { align: "right" });
      if (sale.customerTaxNo) {
        doc.text(
          `Vergi No: ${sale.customerTaxNo}`,
          pageW - 40,
          86,
          { align: "right" }
        );
      }

      // Satırları oku
      const lines =
        sale.lines || sale.saleLines || sale.items || sale.rows || [];

      const bodyRows =
        lines.length > 0
          ? lines.map((l, i) => {
              const ad =
                l.productName ||
                l.urunAd ||
                l.name ||
                l.ad ||
                l.sku ||
                "-";
              const qty = Number(l.quantity || l.adet || 0);
              const price = Number(l.unitPrice || l.fiyat || 0);
              const kdv = Number(l.kdv || 0);
              const cur = l.currency || sale.currency || "TRY";
              const base = qty * price;
              const kdvTutar = (base * kdv) / 100;
              const toplam = base + kdvTutar;

              return [
                i + 1,
                ad,
                qty,
                `${fmt(price)} ${cur}`,
                `%${kdv}`,
                `${fmt(toplam)} ${cur}`,
              ];
            })
          : [
              [
                1,
                "-",
                1,
                `0,00 ${sale.currency || "TRY"}`,
                "%0",
                `0,00 ${sale.currency || "TRY"}`,
              ],
            ];

      autoTable(doc, {
        startY: 150,
        head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Tutar"]],
        body: bodyRows,
        styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.2 },
        headStyles: {
          fillColor: [255, 140, 0],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 26 },
          2: { halign: "right", cellWidth: 60 },
          3: { halign: "right", cellWidth: 90 },
          4: { halign: "right", cellWidth: 50 },
          5: { halign: "right", cellWidth: 90 },
        },
        theme: "grid",
      });

      const totalY = doc.lastAutoTable.finalY + 20;

      const cur = sale.currency || "TRY";
      const genel = Number(sale.totalTRY || 0);

      setFont("bold");
      doc.setFontSize(11);
      doc.text(
        `Genel Toplam: ${fmt(genel)} ${cur}`,
        pageW - 40,
        totalY,
        { align: "right" }
      );

      setFont("normal");
      doc.setFontSize(9);
      doc.text(
        "Bu fiş SatışTakip ERP üzerinden elektronik ortamda oluşturulmuştur.",
        pageW / 2,
        pageH - 30,
        { align: "center" }
      );

      const fileName = `Satis-${sale.saleNo || "fis"}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF oluşturma hatası:", err);
      alert("❌ PDF oluşturulamadı. Konsolu kontrol edin.");
    }
  };
  /**
   * Detay modalını aç
   */
  const openDetail = (sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  const closeDetail = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  // Modal içi satırları formatla
  const getSaleLines = (sale) => {
    if (!sale) return [];
    return (
      sale.lines ||
      sale.saleLines ||
      sale.items ||
      sale.rows ||
      []
    );
  };

  const renderModal = () => {
    if (!showModal || !selectedSale) return null;

    const lines = getSaleLines(selectedSale);
    const musteri =
      selectedSale.customerName ||
      selectedSale.accountName ||
      selectedSale.cariAd ||
      "-";
    const tarih = selectedSale.date
      ? new Date(selectedSale.date).toLocaleString("tr-TR")
      : "-";

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Satış Detayı – {selectedSale.saleNo || "-"}
            </h2>
            <button
              onClick={closeDetail}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            >
              Kapat ✖
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
            <div className="space-y-1">
              <div>
                <span className="font-medium">Müşteri: </span>
                {musteri}
              </div>
              <div>
                <span className="font-medium">Tarih: </span>
                {tarih}
              </div>
              <div>
                <span className="font-medium">Fatura No: </span>
                {selectedSale.invoiceNo || "-"}
              </div>
              <div>
                <span className="font-medium">Sipariş No: </span>
                {selectedSale.orderNo || "-"}
              </div>
            </div>

            <div className="space-y-1">
              <div>
                <span className="font-medium">Para Birimi: </span>
                {selectedSale.currency || "TRY"}
              </div>
              <div>
                <span className="font-medium">Genel Toplam: </span>
                {fmt(selectedSale.totalTRY || 0)}{" "}
                {selectedSale.currency || "TRY"}
              </div>
              {selectedSale.note && (
                <div>
                  <span className="font-medium">Not: </span>
                  {selectedSale.note}
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left">Ürün</th>
                  <th className="px-2 py-2 text-right">Adet</th>
                  <th className="px-2 py-2 text-right">Birim Fiyat</th>
                  <th className="px-2 py-2 text-right">KDV (%)</th>
                  <th className="px-2 py-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-gray-500 py-3"
                    >
                      Satır bilgisi bulunamadı.
                    </td>
                  </tr>
                ) : (
                  lines.map((l, idx) => {
                    const ad =
                      l.productName ||
                      l.urunAd ||
                      l.name ||
                      l.ad ||
                      l.sku ||
                      "-";
                    const qty = Number(l.quantity || l.adet || 0);
                    const price = Number(l.unitPrice || l.fiyat || 0);
                    const kdv = Number(l.kdv || 0);
                    const base = qty * price;
                    const kdvTutar = (base * kdv) / 100;
                    const toplam = base + kdvTutar;
                    const cur =
                      l.currency || selectedSale.currency || "TRY";

                    return (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1">{ad}</td>
                        <td className="px-2 py-1 text-right">{qty}</td>
                        <td className="px-2 py-1 text-right">
                          {fmt(price)} {cur}
                        </td>
                        <td className="px-2 py-1 text-right">%{kdv}</td>
                        <td className="px-2 py-1 text-right">
                          {fmt(toplam)} {cur}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => pdfYazdir(selectedSale)}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              🧾 Bu Satış İçin PDF
            </button>
            <button
              onClick={closeDetail}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <RequireAuth>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-orange-600">🧾 Satışlar</h1>

        {/* Rapor Özeti */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="px-4 py-2 rounded-lg bg-white border shadow-sm">
            <div className="text-gray-500">Toplam Satış Adedi</div>
            <div className="text-lg font-semibold">{totalCount}</div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white border shadow-sm">
            <div className="text-gray-500">Genel Toplam (TRY)</div>
            <div className="text-lg font-semibold text-green-700">
              ₺{fmt(totalAmount)}
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm text-gray-600">Arama</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Satış No, müşteri, fatura no..."
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Tarih</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Tablo */}
        <div className="mt-4 overflow-auto border rounded bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Satış No</th>
                <th className="px-3 py-2 text-left">Müşteri</th>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Fatura No</th>
                <th className="px-3 py-2 text-left">Sipariş No</th>
                <th className="px-3 py-2 text-right">Tutar (TRY)</th>
                <th className="px-3 py-2 text-center">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-4 text-gray-500"
                  >
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const tarih = s.date
                    ? new Date(s.date).toLocaleDateString("tr-TR")
                    : s.invoiceDate
                    ? new Date(s.invoiceDate).toLocaleDateString("tr-TR")
                    : "-";

                  const musteri =
                    s.customerName || s.accountName || s.cariAd || "-";

                  return (
                    <tr
                      key={s._id || i}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="px-3 py-2">{s.saleNo || "-"}</td>
                      <td className="px-3 py-2">{musteri}</td>
                      <td className="px-3 py-2">{tarih}</td>
                      <td className="px-3 py-2">{s.invoiceNo || "-"}</td>
                      <td className="px-3 py-2">{s.orderNo || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {fmt(s.totalTRY || 0)} {s.currency || "TRY"}
                      </td>
                      <td className="px-3 py-2 text-center space-x-2">
                        <button
                          onClick={() => openDetail(s)}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs"
                        >
                          Detay
                        </button>
                        <button
                          onClick={() => pdfYazdir(s)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {renderModal()}
      </div>
    </RequireAuth>
  );
}
