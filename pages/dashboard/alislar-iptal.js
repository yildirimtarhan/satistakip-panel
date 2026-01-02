"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";

export default function AlislarIptalPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/purchases/cancelled", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("İptal alışlar yüklenemedi", e);
    } finally {
      setLoading(false);
    }
  };

  const calcTotal = (items = []) =>
    items.reduce((s, i) => s + Number(i.total || 0), 0);

  if (loading) return <div className="p-6">Yükleniyor…</div>;

  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">İptal Edilen Alışlar</h1>

        {list.length === 0 ? (
          <div>Kayıt yok</div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Tarih</th>
                <th className="border px-2 py-1">Cari</th>
                <th className="border px-2 py-1 text-right">Toplam (₺)</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td className="border px-2 py-1">
                    {new Date(p.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="border px-2 py-1">
                    {p.accountId?.unvan || p.accountId?.ad || "-"}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {calcTotal(p.items).toLocaleString("tr-TR", {
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
