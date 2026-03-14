"use client";

import { useState, useEffect } from "react";

function formatAmount(obj) {
  if (typeof obj === "number") return `₺${obj.toFixed(2)}`;
  if (obj?.value != null) return `₺${Number(obj.value).toFixed(2)}`;
  if (obj?.valueString) return obj.valueString;
  return "-";
}

export default function PazaramaReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({});
  const [pageReport, setPageReport] = useState({});
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refundStatus, setRefundStatus] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadReturns = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        return;
      }
      let url = `/api/pazarama/returns?requestStartDate=${startDate}&requestEndDate=${endDate}&page=1&size=50`;
      if (refundStatus) url += `&refundStatus=${refundStatus}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Bağlantı hatası");
      setReturns(data.data || []);
      setPagination(data.pagination || {});
      setPageReport(data.pageReport || {});
    } catch (e) {
      setError(e.message);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    loadReturns();
  }, []);

  const handleStatusUpdate = async (refundId, status) => {
    if (!refundId) return;
    setUpdatingId(refundId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/pazarama/returns/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ refundId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "İşlem başarısız");
      await loadReturns();
    } catch (e) {
      alert(e.message || "Statü güncellenirken hata oluştu.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pazarama İadeler</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Durum</label>
          <select
            value={refundStatus}
            onChange={(e) => setRefundStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Tümü</option>
            <option value="1">İade Onayı Bekliyor</option>
            <option value="2">Onaylandı</option>
            <option value="3">Reddedildi</option>
          </select>
        </div>
        <button
          onClick={loadReturns}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Yükleniyor..." : "İadeleri Getir"}
        </button>
      </div>

      {(pageReport.totalRefundCount != null || pageReport.totalWaitingRefundCount != null) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {pageReport.totalRefundCount != null && (
            <div className="bg-white p-3 rounded-lg shadow border">
              <div className="text-xs text-gray-500">Toplam İade</div>
              <div className="text-lg font-semibold">{pageReport.totalRefundCount}</div>
            </div>
          )}
          {pageReport.totalWaitingRefundCount != null && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-700">Onay Bekleyen</div>
              <div className="text-lg font-semibold text-amber-800">{pageReport.totalWaitingRefundCount}</div>
            </div>
          )}
          {pageReport.totalApprovedRefundCount != null && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xs text-green-700">Onaylanan</div>
              <div className="text-lg font-semibold text-green-800">{pageReport.totalApprovedRefundCount}</div>
            </div>
          )}
          {pageReport.totalRejectedRefundCount != null && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-xs text-red-700">Reddedilen</div>
              <div className="text-lg font-semibold text-red-800">{pageReport.totalRejectedRefundCount}</div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : returns.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">
          Bu tarih aralığında iade bulunamadı.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İade No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İade Tutarı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {returns.map((r, i) => (
                  <tr key={r.refundId || r.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.refundNumber || "-"}</td>
                    <td className="px-4 py-3">{r.orderNumber || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{r.productName || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.customerName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-800">
                        {r.refundStatusName || r.refundStatus || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatAmount(r.refundAmount)}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{r.refundDate || r.orderDate || "-"}</td>
                    <td className="px-4 py-3">
                      {r.refundStatus === 1 && r.refundId ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(r.refundId, 2)}
                            disabled={updatingId === r.refundId}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {updatingId === r.refundId ? "..." : "Onayla"}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(r.refundId, 3)}
                            disabled={updatingId === r.refundId}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
