"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function StokHareketleri() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ urun: "", cari: "", type: "" });

  const token = Cookies.get("token");

  const fetchLogs = async () => {
    const res = await fetch("/api/stok-hareketleri", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l =>
    (filter.urun ? l.product?.toLowerCase().includes(filter.urun.toLowerCase()) : true) &&
    (filter.cari ? l.account?.toLowerCase().includes(filter.cari.toLowerCase()) : true) &&
    (filter.type ? l.type === filter.type : true)
  );

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold mb-3">📦 Stok Hareketleri</h2>

      {/* Filtreler */}
      <div className="bg-white border p-3 rounded grid grid-cols-12 gap-3 text-sm">
        <input
          placeholder="Ürün adı"
          className="border p-2 rounded col-span-4"
          onChange={(e) => setFilter({ ...filter, urun: e.target.value })}
        />
        <input
          placeholder="Cari adı"
          className="border p-2 rounded col-span-4"
          onChange={(e) => setFilter({ ...filter, cari: e.target.value })}
        />
        <select
          className="border p-2 rounded col-span-4"
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
        >
          <option value="">İşlem Türü</option>
          <option value="purchase">Alış</option>
          <option value="sale">Satış</option>
          <option value="manual">Manuel Düzeltme</option>
          <option value="return">İade</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="bg-white border rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs">
            <tr>
              <th className="p-2">Tarih</th>
              <th className="p-2">Ürün</th>
              <th className="p-2">Cari</th>
              <th className="p-2">İşlem</th>
              <th className="p-2">Miktar</th>
              <th className="p-2">Birim Fiyat</th>
              <th className="p-2">PB</th>
              <th className="p-2">Toplam</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-2">{new Date(l.date).toLocaleString("tr-TR")}</td>
                <td className="p-2">{l.product}</td>
                <td className="p-2">{l.account}</td>
                <td className="p-2">
                  {l.type === "purchase" && "📥 Alış"}
                  {l.type === "sale" && "📤 Satış"}
                  {l.type === "manual" && "⚙️ Manuel"}
                  {l.type === "return" && "↩️ İade"}
                </td>
                <td className="p-2 text-right">{l.quantity}</td>
                <td className="p-2 text-right">{l.unitPrice}</td>
                <td className="p-2">{l.currency}</td>
                <td className="p-2 text-right">{l.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
