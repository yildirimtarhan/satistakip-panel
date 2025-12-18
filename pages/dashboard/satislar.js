"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";

const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export default function Satislar() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token =
    Cookies.get("token") || localStorage.getItem("token") || "";

  useEffect(() => {
    load();
  }, []);

  // =========================
  // SATIŞLARI YÜKLE
  // =========================
  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/sales", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Rapor alınamadı");
      setRows(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // PDF AÇ
  // =========================
  function openPdf(saleNo) {
    window.open(`/api/sales/pdf?saleNo=${saleNo}`, "_blank");
  }

  // =========================
  // ✅ SATIŞ İPTAL / İADE
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
      if (!res.ok) throw new Error(data.message || "İptal başarısız");

      alert("Satış başarıyla iptal edildi");
      load(); // 🔁 listeyi yenile
    } catch (e) {
      alert(e.message || "Satış iptal edilemedi");
    }
  }

  // =========================
  // JSX
  // =========================
  return (
    <RequireAuth>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Satışlar</h1>
          <div className="text-sm text-gray-500">
            Toplam Kayıt: {rows.length}
          </div>
        </div>

        {loading && <div>Yükleniyor...</div>}
        {err && <div className="text-red-600">{err}</div>}

        {!loading && !rows.length && (
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
                {rows.map((r) => (
                  <tr key={r.saleNo} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono">{r.saleNo}</td>
                    <td className="p-2">
                      {new Date(r.date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-2">{r.accountName}</td>
                    <td className="p-2 text-right font-semibold">
                      {fmt(r.totalTRY)}
                    </td>
                    <td className="p-2 text-right space-x-2">
                      <button
                        className="border px-2 py-1 rounded"
                        onClick={() => openPdf(r.saleNo)}
                      >
                        PDF
                      </button>

                      <button
                        className="border px-2 py-1 rounded"
                        onClick={() =>
                          (window.location.href =
                            `/dashboard/urun-satis?saleNo=${r.saleNo}`)
                        }
                      >
                        Düzelt
                      </button>

                      <button
                        className="border px-2 py-1 rounded text-red-600"
                        onClick={() => cancelSale(r.saleNo)}
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
