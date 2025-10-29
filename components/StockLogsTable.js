// 📊 components/StockLogsTable.js
import { useEffect, useState } from "react";

export default function StockLogsTable({ productId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/urunler/stock-logs?productId=${productId}`);
        const data = await res.json();
        setLogs(data);
      } catch (e) {
        console.error("Stok logları alınamadı:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [productId]);

  return (
    <div className="border rounded-xl mt-6 overflow-hidden">
      <h3 className="bg-orange-100 text-orange-700 font-semibold text-lg p-3">
        📦 Stok Hareketleri
      </h3>

      {loading ? (
        <p className="p-4 text-gray-500">Yükleniyor...</p>
      ) : logs.length === 0 ? (
        <p className="p-4 text-gray-500">Henüz işlem yok.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Tarih</th>
              <th className="border p-2">Tür</th>
              <th className="border p-2">Miktar</th>
              <th className="border p-2">Birim Fiyat</th>
              <th className="border p-2">Tutar</th>
              <th className="border p-2">Cari</th>
              <th className="border p-2">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id} className="hover:bg-orange-50">
                <td className="border p-2 text-center">
                  {new Date(l.date).toLocaleString("tr-TR")}
                </td>
                <td className={`border p-2 text-center ${l.type === "Satış" ? "text-red-600" : "text-green-600"}`}>
                  {l.type}
                </td>
                <td className="border p-2 text-right">{l.quantity}</td>
                <td className="border p-2 text-right">{l.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                <td className="border p-2 text-right">{l.total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                <td className="border p-2">{l.account}</td>
                <td className="border p-2 capitalize">{l.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
