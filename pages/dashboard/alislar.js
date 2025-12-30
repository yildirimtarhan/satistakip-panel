"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";

export default function AlislarPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token =
    Cookies.get("token") || localStorage.getItem("token") || "";

  useEffect(() => {
    if (!token) return;

    const fetchList = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/purchases/list", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Alışlar alınamadı");
          return;
        }

        setList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Alış listeleme hatası:", err);
        setError("Sunucu hatası");
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [token]);

  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">📦 Alışlar</h1>

        {loading && (
          <div className="text-sm text-gray-500">
            Yükleniyor...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white border rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Tarih</th>
                  <th className="p-2 border">Cari</th>
                  <th className="p-2 border">Tür</th>
                  <th className="p-2 border text-right">
                    Tutar (₺)
                  </th>
                  <th className="p-2 border">
                    Açıklama
                  </th>
                </tr>
              </thead>

              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-4 text-center text-gray-500"
                    >
                      Kayıt bulunamadı
                    </td>
                  </tr>
                )}

                {list.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-2 border">
                      {new Date(r.date).toLocaleDateString(
                        "tr-TR"
                      )}
                    </td>
                    <td className="p-2 border">
                      {r.accountId?.ad || "-"}
                    </td>
                    <td className="p-2 border">
                      {r.type === "purchase"
                        ? "Ürün Alış"
                        : r.type}
                    </td>
                    <td className="p-2 border text-right">
                      ₺{Number(r.amount || 0).toFixed(2)}
                    </td>
                    <td className="p-2 border">
                      {r.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
