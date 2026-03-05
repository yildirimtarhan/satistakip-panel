// 📄 /pages/dashboard/efatura/gelenler.js – Gelen E-Faturalar
import { useEffect, useState } from "react";
import Link from "next/link";

export default function GelenlerEFatura() {
  const [faturalar, setFaturalar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaturalar();
  }, []);

  const fetchFaturalar = async () => {
    try {
      const res = await fetch("/api/efatura/incoming", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setFaturalar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gelen fatura listesi alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📥 Gelen Faturalar
      </h1>

      {loading && <div className="text-center py-8">Yükleniyor...</div>}

      {!loading && faturalar.length === 0 && (
        <div className="bg-white p-6 rounded-xl shadow text-center text-slate-500 space-y-2">
          <p>📭 Henüz gelen fatura kaydı yok.</p>
          <p className="text-sm">
            GİB / Taxten entegrasyonu ile gelen e-faturalar burada listelenecektir.
          </p>
        </div>
      )}

      {!loading && faturalar.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-3 py-2 text-left">Fatura No</th>
                <th className="px-3 py-2 text-left">Gönderen</th>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Tür</th>
                <th className="px-3 py-2 text-right">Toplam</th>
                <th className="px-3 py-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {faturalar.map((f) => (
                <tr key={f._id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{f.invoiceNo || f.faturaNo || "-"}</td>
                  <td className="px-3 py-2">{f.senderTitle || f.gonderen || "—"}</td>
                  <td className="px-3 py-2">
                    {(f.receivedAt || f.issueDate || f.createdAt)
                      ? new Date(f.receivedAt || f.issueDate || f.createdAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{f.invoiceType || f.tip || "-"}</td>
                  <td className="px-3 py-2 text-right font-bold">
                    ₺{Number(f.total || f.payableAmount || 0).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {f.pdfUrl && (
                      <a href={f.pdfUrl} target="_blank" rel="noreferrer" className="text-orange-600">
                        📄 PDF
                      </a>
                    )}
                    {!f.pdfUrl && "—"}
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
