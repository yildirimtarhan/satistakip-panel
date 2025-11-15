// 📄 /pages/dashboard/efatura/taslaklar.js
import { useEffect, useState } from "react";
import Link from "next/link";

export default function EFaturaTaslaklar() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📝 E-Fatura Taslaklar
      </h1>

      <div className="flex justify-between my-3">
        <Link
          href="/dashboard/efatura/yeni"
          className="btn-primary"
        >
          ➕ Yeni Taslak Oluştur
        </Link>
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
                <th className="px-3 py-2 text-left">Fatura Türü</th>
                <th className="px-3 py-2">Oluşturma</th>
                <th className="px-3 py-2 text-right">Toplam</th>
                <th className="px-3 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {list.map((fatura, i) => (
                <tr key={fatura._id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{i + 1}</td>

                  <td className="px-3 py-2">
                    {fatura.cariAd || "-"}
                  </td>

                  <td className="px-3 py-2">{fatura.tip}</td>

                  <td className="px-3 py-2">
                    {new Date(fatura.createdAt).toLocaleDateString(
                      "tr-TR"
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-bold">
                    ₺{(fatura.genelToplam || 0).toLocaleString("tr-TR")}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/efatura/yeni?id=${fatura._id}`}
                        className="text-blue-600"
                      >
                        ✏️ Düzenle
                      </Link>

                      <button
                        className="text-green-600"
                        onClick={() =>
                          router.push(
                            `/dashboard/efatura/onizleme?id=${fatura._id}`
                          )
                        }
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
