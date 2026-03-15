"use client";
/**
 * E-İrsaliye Paneli
 * Taxten E-İrsaliye REST API entegrasyonu
 */
import { useEffect, useState } from "react";

export default function IrsaliyePage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");

  const fetchSent = async () => {
    try {
      const res = await fetch("/api/efatura/irsaliye/sent", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setList(Array.isArray(data) ? data : data.list || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">📋 E-İrsaliye</h1>
      <p className="text-slate-600 mb-6">
        Taxten E-İrsaliye REST API ile irsaliye gönderimi ve takibi. API: <code className="bg-slate-100 px-1 rounded">/api/efatura/irsaliye/*</code>
      </p>

      <div className="bg-white rounded-xl shadow p-6 max-w-4xl">
        <h2 className="font-semibold text-slate-700 mb-4">Gönderilen İrsaliyeler</h2>
        {loading ? (
          <p>Yükleniyor...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">Henüz gönderilmiş irsaliye yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-2 px-3">İrsaliye No</th>
                  <th className="text-left py-2 px-3">Tarih</th>
                  <th className="text-left py-2 px-3">UUID</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{item.irsaliyeNo || "-"}</td>
                    <td className="py-2 px-3">
                      {item.sentAt ? new Date(item.sentAt).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{item.uuid || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-slate-50 rounded-lg p-4 max-w-4xl">
        <h2 className="font-semibold text-slate-700 mb-2">API Kullanımı</h2>
        <ul className="text-sm text-slate-600 space-y-1">
          <li><code>POST /api/efatura/irsaliye/send</code> — İrsaliye gönder</li>
          <li><code>GET /api/efatura/irsaliye/ubl-list</code> — Taxten&apos;den liste</li>
          <li><code>POST /api/efatura/irsaliye/ubl</code> — Belge indir</li>
          <li><code>POST /api/efatura/irsaliye/status</code> — Zarf durumu</li>
          <li><code>POST /api/efatura/irsaliye/view</code> — PDF/HTML görüntü</li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">
          Her irsaliye 1 kontör düşer (E-Fatura Kontör sayfasından takip edebilirsiniz).
        </p>
      </div>
    </div>
  );
}
