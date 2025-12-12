"use client";
import { useEffect, useState } from "react";

export default function Basvurularim() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/edonusum/applications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setList(data.list || []);
    } catch (err) {
      console.error("Başvurular alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  if (loading) return <div className="p-6">Yükleniyor...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 Başvurularım
      </h1>

      {list.length === 0 && (
        <p className="text-slate-600 text-center mt-4">
          Henüz başvurunuz bulunmuyor.
        </p>
      )}

      {list.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="p-2">Tarih</th>
                <th className="p-2">Modüller</th>
                <th className="p-2">Paket</th>
                <th className="p-2">Durum</th>
                <th className="p-2">Not</th>
              </tr>
            </thead>

            <tbody>
              {list.map((b) => (
                <tr key={b._id} className="border-b hover:bg-slate-50">
                  <td className="p-2">
                    {new Date(b.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="p-2">
                    {b.modules.efatura && "E-Fatura "}
                    {b.modules.earsiv && " | E-Arşiv "}
                    {b.modules.eirsaliye && " | E-İrsaliye"}
                  </td>
                  <td className="p-2">{b.packageType}</td>
                  <td className="p-2 font-semibold">
                    {b.status === "pending" && (
                      <span className="text-yellow-600">⏳ Beklemede</span>
                    )}
                    {b.status === "approved" && (
                      <span className="text-green-600">✔ Onaylandı</span>
                    )}
                    {b.status === "rejected" && (
                      <span className="text-red-600">❌ Reddedildi</span>
                    )}
                  </td>
                  <td className="p-2 text-slate-600">{b.adminNote || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
