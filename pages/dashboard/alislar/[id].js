"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import RequireAuth from "@/components/RequireAuth";

export default function AlisDetayPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const token =
    Cookies.get("token") || localStorage.getItem("token");

  // 🔹 DETAYI ÇEK
  useEffect(() => {
    if (!id || !token) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/purchases/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        setData(json);
      } catch (err) {
        console.error("Alış detay hata:", err);
        alert(err.message || "Alış detayı alınamadı");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, token]);

  // 🔴 ALIŞ İPTAL
  const handleCancel = async () => {
    if (!confirm("Bu alış iptal edilecek. Emin misiniz?")) return;

    try {
      setCanceling(true);

      const res = await fetch("/api/purchases/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId: id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      alert("✅ Alış iptal edildi");
      router.push("/dashboard/alislar");
    } catch (err) {
      alert(err.message || "İptal sırasında hata oluştu");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) return <div className="p-6">Yükleniyor...</div>;
  if (!data) return <div className="p-6">Kayıt bulunamadı</div>;

  const isCancelled = data.status === "cancelled";

  return (
    <RequireAuth>
      <div className="p-6 space-y-6">
        {/* ÜST BİLGİ */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Alış Detayı</h1>
            <div className="text-sm text-gray-600">
              Cari: <b>{data.accountId?.unvan}</b>
            </div>
            <div className="text-sm text-gray-600">
              Tarih:{" "}
              {new Date(data.invoiceDate).toLocaleDateString("tr-TR")}
            </div>
            {data.invoiceNo && (
              <div className="text-sm text-gray-600">
                Fatura No: {data.invoiceNo}
              </div>
            )}
            {isCancelled && (
              <div className="mt-1 text-sm font-semibold text-red-600">
                ❌ Bu alış iptal edilmiştir
              </div>
            )}
          </div>

          {/* İPTAL BUTONU */}
          {!isCancelled && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60"
            >
              {canceling ? "İptal Ediliyor..." : "Alışı İptal Et"}
            </button>
          )}
        </div>

        {/* ÜRÜN TABLOSU */}
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Ürün</th>
              <th className="border px-2 py-1">Barkod</th>
              <th className="border px-2 py-1 text-right">Adet</th>
              <th className="border px-2 py-1 text-right">Birim ₺</th>
              <th className="border px-2 py-1 text-right">Toplam ₺</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  {i.productId?.ad || "-"}
                </td>
                <td className="border px-2 py-1">
                  {i.productId?.barkod || "-"}
                </td>
                <td className="border px-2 py-1 text-right">
                  {i.quantity}
                </td>
                <td className="border px-2 py-1 text-right">
                  {Number(i.unitPrice).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="border px-2 py-1 text-right">
                  {Number(i.total).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOPLAM */}
        <div className="text-right font-semibold text-lg">
          Genel Toplam:{" "}
          {Number(data.totalTRY || data.total).toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
          })}{" "}
          ₺
        </div>

        {/* NOT */}
        {data.note && (
          <div className="text-sm text-gray-700">
            <b>Not:</b> {data.note}
          </div>
        )}

        {/* GERİ */}
        <button
          onClick={() => router.push("/dashboard/alislar")}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          ← Listeye Dön
        </button>
      </div>
    </RequireAuth>
  );
}
