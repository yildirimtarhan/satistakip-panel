"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";

export default function AlislarPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch("/api/purchases/list", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Alışlar yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  const calcTotal = (items = []) =>
    items.reduce((sum, i) => sum + Number(i.totalTRY ?? i.total ?? 0), 0);

  // ✅ Yeni: alış satırlarından para birimi ve kur bul (ilk dövizli satırı yakalar)
  const getCurrencyAndFx = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return { currency: "TRY", fxRate: 1 };

    const fxItem =
      items.find((x) => (x.currency || "TRY") !== "TRY") || items[0];

    return {
      currency: fxItem?.currency || "TRY",
      fxRate: Number(fxItem?.fxRate || 1),
    };
  };

  if (loading) return <div className="p-6">Yükleniyor…</div>;

  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Alışlar</h1>

        {list.length === 0 ? (
          <div>Kayıt bulunamadı</div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Tarih</th>
                <th className="border px-2 py-1">Cari</th>

                {/* ✅ EKLENDİ */}
                <th className="border px-2 py-1 text-center">Para</th>
                <th className="border px-2 py-1 text-right">Kur</th>

                <th className="border px-2 py-1">Açıklama</th>
                <th className="border px-2 py-1 text-right">Toplam (₺)</th>
                <th className="border px-2 py-1 text-center">Detay</th>
              </tr>
            </thead>

            <tbody>
              {list.map((p) => {
                const total = calcTotal(p.items);

                const { currency, fxRate } = getCurrencyAndFx(p.items);

                return (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">
                      {p.date ? new Date(p.date).toLocaleDateString("tr-TR") : "-"}
                    </td>

                    <td className="border px-2 py-1">
                      {p.accountId?.unvan ||
                        p.accountId?.ad ||
                        p.accountId?.email ||
                        "-"}
                    </td>

                    {/* ✅ EKLENDİ */}
                    <td className="border px-2 py-1 text-center">
                      {currency || "TRY"}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {Number(fxRate || 1).toFixed(4)}
                    </td>

                    <td className="border px-2 py-1">
                      {p.description || "Alış"}
                    </td>

                    <td className="border px-2 py-1 text-right">
                      {total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="border px-2 py-1 text-center">
                      <Link
                        href={`/dashboard/alislar/${p._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Gör
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </RequireAuth>
  );
}
