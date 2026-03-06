// 📄 Gelen fatura detay sayfası
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function GelenDetay() {
  const router = useRouter();
  const { id } = router.query;
  const [fatura, setFatura] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    fetch(`/api/efatura/incoming/single?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setFatura)
      .catch(() => setFatura(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center">Yükleniyor...</div>;
  if (!fatura) return <div className="p-6 text-center text-red-600">Fatura bulunamadı.</div>;

  const no = fatura.invoiceNo || fatura.faturaNo || "-";
  const sender = fatura.senderTitle || fatura.gonderen || "—";
  const total = fatura.total ?? fatura.payableAmount ?? 0;
  const status = fatura.responseStatus || fatura.durum || "—";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">📥 Gelen Fatura Detay</h1>

      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <div className="flex justify-between flex-wrap gap-2">
          <span className="font-semibold">Fatura No:</span>
          <span>{no}</span>
        </div>
        <div className="flex justify-between flex-wrap gap-2">
          <span className="font-semibold">Gönderici:</span>
          <span>{sender}</span>
        </div>
        <div className="flex justify-between flex-wrap gap-2">
          <span className="font-semibold">Geliş Tarihi:</span>
          <span>{fatura.receivedAt ? new Date(fatura.receivedAt).toLocaleString("tr-TR") : "—"}</span>
        </div>
        <div className="flex justify-between flex-wrap gap-2">
          <span className="font-semibold">Fatura Tarihi:</span>
          <span>{fatura.issueDate ? new Date(fatura.issueDate).toLocaleDateString("tr-TR") : "—"}</span>
        </div>
        <div className="flex justify-between flex-wrap gap-2">
          <span className="font-semibold">Tutar:</span>
          <span className="font-bold">₺{Number(total).toLocaleString("tr-TR")}</span>
        </div>
        <div className="flex justify-between flex-wrap gap-2">
          <span className="font-semibold">Durum:</span>
          <span>
            {status === "accepted" && <span className="text-green-600">Kabul</span>}
            {status === "rejected" && <span className="text-red-600">Ret</span>}
            {status === "returned" && <span className="text-amber-600">İade</span>}
            {!["accepted", "rejected", "returned"].includes(status) && status}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href="/dashboard/efatura/gelenler" className="px-4 py-2 bg-slate-200 rounded-lg">
          ← Listeye Dön
        </Link>
        {fatura.pdfUrl && (
          <a href={fatura.pdfUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-orange-600 text-white rounded-lg">
            📄 PDF İndir
          </a>
        )}
      </div>
    </div>
  );
}
