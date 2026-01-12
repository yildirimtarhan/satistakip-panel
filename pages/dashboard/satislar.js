// /pages/dashboard/satislar.js
"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export default function Satislar() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = Cookies.get("token") || localStorage.getItem("token") || "";

  useEffect(() => {
    if (!token) return;
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // =========================
  // SATIŞLARI YÜKLE
  // =========================
  async function loadSales() {
    try {
      setLoading(true);
      setErr("");

      const res = await fetch("/api/reports/sales", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Rapor alınamadı");

      const list = Array.isArray(data?.records) ? data.records : [];
      setRows(list);
    } catch (e) {
      setErr(e?.message || "Satışlar yüklenemedi");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // PDF AÇ
  // =========================
  // =========================
// PDF AÇ (TOKEN İLE)
// =========================

// =========================
// PDF AÇ (Authorization ile)
// =========================
async function openPdf(saleNo) {
  try {
    const res = await fetch(`/api/sales/pdf?saleNo=${encodeURIComponent(saleNo)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const blob = await res.blob();

    if (!res.ok) {
      // JSON mesajı varsa yakala
      const text = await blob.text();
      try {
        const j = JSON.parse(text);
        throw new Error(j?.message || "PDF üretilemedi");
      } catch {
        throw new Error(text || "PDF üretilemedi");
      }
    }

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");

    // 1 dk sonra cleanup
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    alert(e?.message || "PDF üretilemedi");
  }
}


  // =========================
  // SATIŞ İPTAL
  // =========================
  async function cancelSale(saleNo) {
    if (
      !confirm(
        `${saleNo} numaralı satış iptal edilecek.\nStok ve cari geri alınacak.\nEmin misiniz?`
      )
    ) {
      return;
    }

    const reason = prompt("İptal nedeni (opsiyonel):") || "";

    try {
      const res = await fetch("/api/sales/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ saleNo, reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "İptal başarısız");

      alert("Satış başarıyla iptal edildi");
      loadSales();
    } catch (e) {
      alert(e?.message || "Satış iptal edilemedi");
    }
  }

  return (
    <RequireAuth>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Satışlar</h1>
          <div className="text-sm text-gray-500">Toplam Kayıt: {rows.length}</div>
        </div>

        {loading && <div>Yükleniyor...</div>}
        {err && <div className="text-red-600">{err}</div>}

        {!loading && !rows.length && !err && (
          <div className="text-gray-500">Kayıt bulunamadı.</div>
        )}

        {!!rows.length && (
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Satış No</th>
                  <th className="p-2 text-left">Tarih</th>
                  <th className="p-2 text-left">Cari</th>
                  <th className="p-2 text-right">Toplam (TRY)</th>
                  <th className="p-2"></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.saleNo || "sale"}-${idx}`} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono">{r.saleNo || "-"}</td>
                    <td className="p-2">
                      {r?.date ? new Date(r.date).toLocaleDateString("tr-TR") : "-"}
                    </td>
                    <td className="p-2">{r.accountName || "-"}</td>
                    <td className="p-2 text-right font-semibold">{fmt(r.totalTRY)}</td>
                    <td className="p-2 text-right space-x-2">
                      <button
                        className="border px-2 py-1 rounded"
                        onClick={() => openPdf(r.saleNo)}
                        disabled={!r.saleNo || r.saleNo === "-"}
                      >
                        PDF
                      </button>

                      <button
                        className="border px-2 py-1 rounded"
                        onClick={() =>
                          (window.location.href = `/dashboard/urun-satis?saleNo=${encodeURIComponent(
                            r.saleNo || ""
                          )}`)
                        }
                        disabled={!r.saleNo || r.saleNo === "-"}
                      >
                        Düzelt
                      </button>

                      <button
                        className="border px-2 py-1 rounded text-red-600"
                        onClick={() => cancelSale(r.saleNo)}
                        disabled={!r.saleNo || r.saleNo === "-"}
                      >
                        İptal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
