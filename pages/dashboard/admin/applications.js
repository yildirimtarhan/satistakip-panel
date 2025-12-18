"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined"
      ? Cookies.get("token") || localStorage.getItem("token")
      : null;

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/edonusum/admin/applications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Başvurular alınamadı");
        return;
      }

      setApplications(data.applications || []);
    } catch (err) {
      console.error("Başvuru çekme hatası:", err);
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadApplications();
  }, [token]);

  if (loading) return <div className="p-6">Yükleniyor...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        🛡️ E-Dönüşüm Başvuru Onayları
      </h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2">Firma</th>
              <th className="p-2">Tür</th>
              <th className="p-2">Durum</th>
              <th className="p-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a._id} className="border-b">
                <td className="p-2">{a.companyName || "-"}</td>
                <td className="p-2">{a.type}</td>
                <td className="p-2">{a.status}</td>
                <td className="p-2">
                  {new Date(a.createdAt).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}

            {applications.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Kayıt yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
