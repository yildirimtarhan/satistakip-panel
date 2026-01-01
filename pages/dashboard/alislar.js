"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import RequireAuth from "@/components/RequireAuth";

export default function AlislarPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = Cookies.get("token") || localStorage.getItem("token");

  const fetchPurchases = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/purchases/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      // ✅ Sadece alış (purchase) olanları al
      const purchases = Array.isArray(data)
        ? data.filter((x) => x.type === "purchase")
        : [];

      setList(purchases);
    } catch (err) {
      console.error("Alış listesi hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPurchases();
  }, [token]);

  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Alışlar</h1>

        {loading ? (
          <div>Yükleniyor...</div>
        ) : list.length === 0 ? (
          <div className="text-gray-500">Kayıt bulunamadı</div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Tarih</th>
                <th className="border px-2 py-1">Cari</th>
                <th className="border px-2 py-1">Açıklama</th>
                <th className="border px-2 py-1 text-right">Toplam (₺)</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td className="border px-2 py-1">
                    {p.date
                      ? new Date(p.date).toLocaleDateString("tr-TR")
                      : "-"}
                  </td>

                  <td className="border px-2 py-1">
                    {p.account?.unvan ||
                      p.account?.firmaAdi ||
                      p.account?.ad ||
                      p.account?.name ||
                      "-"}
                  </td>

                  <td className="border px-2 py-1">
                    {p.description || "Alış"}
                  </td>

                  <td className="border px-2 py-1 text-right">
                    {Number(p.amount || 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </RequireAuth>
  );
}
