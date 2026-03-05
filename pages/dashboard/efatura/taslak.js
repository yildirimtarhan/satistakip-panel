// 📄 /pages/dashboard/efatura/taslak.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function EFaturaTaslaklar() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMailId, setSendingMailId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const fetchList = async () => {
    try {
      const res = await fetch("/api/efatura/drafts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();
      setList(data || []);
    } catch (err) {
      console.error("Taslak faturalar alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const deleteDraft = async (id) => {
    if (!confirm("Bu taslak faturayı silmek istediğinize emin misiniz?"))
      return;

    try {
      await fetch(`/api/efatura/drafts?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      await fetchList();
      alert("🗑️ Taslak fatura silindi");
    } catch (err) {
      console.error("Taslak silinemedi:", err);
    }
  };

  const syncFromTaxten = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/efatura/sync-taxten-drafts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await fetchList();
        alert(data.message || `${data.synced ?? 0} taslak senkronize edildi.`);
      } else {
        alert(data.message || "Taxten taslakları alınamadı.");
      }
    } catch (err) {
      alert("Hata: " + (err.message || "Senkronizasyon başarısız"));
    } finally {
      setSyncing(false);
    }
  };

  const sendCustomerEmail = async (draftId) => {
    setSendingMailId(draftId);
    try {
      const res = await fetch("/api/efatura/send-customer-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("E-posta müşteriye gönderildi: " + (data.message || ""));
      } else {
        alert(data.message || "E-posta gönderilemedi");
      }
    } catch (err) {
      alert("Hata: " + (err.message || "E-posta gönderilemedi"));
    } finally {
      setSendingMailId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📝 E-Fatura Taslaklar
      </h1>

      <div className="flex flex-wrap justify-between items-center gap-3 my-3">
        <Link href="/dashboard/efatura/olustur" className="btn-primary">
          ➕ Yeni Taslak Oluştur
        </Link>
        <button
          type="button"
          onClick={syncFromTaxten}
          disabled={syncing}
          className="bg-slate-600 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          title="Taxten portalında oluşturduğunuz taslakları buraya çeker"
        >
          {syncing ? "Senkronize ediliyor..." : "🔄 Taxten'den taslakları getir"}
        </button>
      </div>

      {/* Yükleniyor */}
      {loading && (
        <div className="text-center py-4">Yükleniyor...</div>
      )}

      {/* Liste */}
      {!loading && list.length === 0 && (
        <div className="text-center py-6 text-slate-600">
          Henüz taslak fatura bulunmuyor.
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2 text-left">Cari</th>
                <th className="px-3 py-2 text-left">Senaryo</th>
                <th className="px-3 py-2 text-left">Tür</th>
                <th className="px-3 py-2">Oluşturma</th>
                <th className="px-3 py-2 text-right">Toplam</th>
                <th className="px-3 py-2">Kaynak</th>
                <th className="px-3 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {list.map((fatura, i) => (
                <tr key={fatura._id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{i + 1}</td>

                  <td className="px-3 py-2">
                    {fatura.customer?.title || fatura.cariAd || "-"}
                  </td>

                  <td className="px-3 py-2">{fatura.scenario === "TEMEL" ? "Temel" : "Ticari"}</td>
                  <td className="px-3 py-2">{(fatura.invoiceType || fatura.tip) === "IADE" ? "İade" : "Satış"}</td>

                  <td className="px-3 py-2">
                    {fatura.createdAt ? new Date(fatura.createdAt).toLocaleDateString("tr-TR") : "-"}
                  </td>

                  <td className="px-3 py-2 text-right font-bold">
                    ₺{(fatura.totals?.total ?? fatura.genelToplam ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>

                  <td className="px-3 py-2">
                    {fatura.source === "taxten" ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-700 rounded">Taxten</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs text-slate-500">Panel</span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/efatura/olustur?id=${fatura._id}`}
                        className="text-blue-600"
                      >
                        ✏️ Düzenle
                      </Link>
                      <button
                        className="text-indigo-600 disabled:opacity-50"
                        onClick={() => sendCustomerEmail(fatura._id)}
                        disabled={sendingMailId === fatura._id}
                        title={fatura.customer?.email ? "Faturayı müşteri e-postasına gönder" : "Müşteri e-postası yok"}
                      >
                        {sendingMailId === fatura._id ? "Gönderiliyor..." : "📧 Mail Gönder"}
                      </button>
                      <button
                        className="text-green-600"
                        onClick={() => router.push(`/dashboard/efatura/onizleme?id=${fatura._id}`)}
                      >
                        📄 Önizle & Gönder
                      </button>
                      <button
                        className="text-red-600"
                        onClick={() => deleteDraft(fatura._id)}
                      >
                        🗑️ Sil
                      </button>
                    </div>
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
