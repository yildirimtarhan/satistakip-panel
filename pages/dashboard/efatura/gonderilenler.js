// 📄 /pages/dashboard/efatura/gonderilenler.js – Gönderilen Faturalar (URL: /dashboard/efatura/gonderilenler)
import { useEffect, useState } from "react";
import Link from "next/link";

export default function GonderilenlerEFatura() {
  const [faturalar, setFaturalar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaturalar();
  }, []);

  const fetchFaturalar = async () => {
    try {
      const res = await fetch("/api/efatura/sent", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setFaturalar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fatura listesi alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📤 Gönderilen Faturalar
      </h1>

      {loading && <div className="text-center py-8">Yükleniyor...</div>}

      {!loading && faturalar.length === 0 && (
        <div className="bg-white p-6 rounded-xl shadow text-center text-slate-500">
          📭 Henüz gönderilmiş fatura yok.
        </div>
      )}

      {!loading && faturalar.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-3 py-2 text-left">Fatura No</th>
                <th className="px-3 py-2 text-left">Cari</th>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-right">Toplam</th>
                <th className="px-3 py-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {faturalar.map((f) => (
                <tr key={f._id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{f.faturaNo || f.invoiceNo || "-"}</td>
                  <td className="px-3 py-2">{f.cariAd || f.cariName || "—"}</td>
                  <td className="px-3 py-2">
                    {(f.sentAt || f.createdAt)
                      ? new Date(f.sentAt || f.createdAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {f.status === "onaylandı" && (
                      <span className="text-green-600 font-semibold">Onaylandı</span>
                    )}
                    {f.status === "reddedildi" && (
                      <span className="text-red-600 font-semibold">Reddedildi</span>
                    )}
                    {f.status === "beklemede" && (
                      <span className="text-orange-600 font-semibold">Beklemede</span>
                    )}
                    {!f.status && <span>-</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    ₺{Number(f.toplam || f.total || 0).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-2 text-center flex gap-3 justify-center">
                    <Link
                      href={`/dashboard/efatura/detay?id=${f._id}`}
                      className="text-blue-700"
                    >
                      👁️
                    </Link>
                    {f.pdfUrl && (
                      <a href={f.pdfUrl} target="_blank" rel="noreferrer" className="text-orange-600">
                        📄
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
