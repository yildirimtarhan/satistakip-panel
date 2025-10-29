// 📄 /pages/dashboard/urunler.js
import { useState, useEffect } from "react";

export default function UrunlerPanel() {
  const [urunler, setUrunler] = useState([]);
  const [form, setForm] = useState({
    ad: "",
    fiyat: "",
    stok: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
  });

  // 🔹 Ürünleri getir
  const fetchUrunler = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/urunler", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUrunler(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Ürünleri çekme hatası:", e);
    }
  };

  // 🔹 Yeni ürün ekle
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/urunler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ad: form.ad,
          fiyat: Number(form.fiyat),
          stok: Number(form.stok),
          paraBirimi: form.paraBirimi,
          kdvOrani: Number(form.kdvOrani),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Ürün ekleme hatası");

      alert("✅ Ürün başarıyla eklendi!");
      setForm({ ad: "", fiyat: "", stok: "", paraBirimi: "TRY", kdvOrani: 20 });
      fetchUrunler();
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  useEffect(() => {
    fetchUrunler();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center text-orange-600 mb-6">
        🛍️ Ürün Yönetim Paneli
      </h1>

      {/* ➕ Yeni Ürün Ekle */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-12 gap-4 max-w-4xl mx-auto mb-10 bg-white p-6 rounded-xl shadow"
      >
        <input
          type="text"
          placeholder="Ürün Adı"
          value={form.ad}
          onChange={(e) => setForm({ ...form, ad: e.target.value })}
          className="border p-2 rounded col-span-12 md:col-span-4"
          required
        />
        <input
          type="number"
          placeholder="Fiyat"
          value={form.fiyat}
          onChange={(e) => setForm({ ...form, fiyat: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />
        <input
          type="number"
          placeholder="Stok"
          value={form.stok}
          onChange={(e) => setForm({ ...form, stok: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={form.paraBirimi}
          onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })}
        >
          <option value="TRY">TRY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={form.kdvOrani}
          onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}
        >
          <option value="1">%1</option>
          <option value="10">%10</option>
          <option value="20">%20</option>
        </select>

        <div className="col-span-12 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            Kaydet
          </button>
        </div>
      </form>

      {/* 📋 Ürün Listesi */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="border p-2 w-14">#</th>
              <th className="border p-2">Ürün</th>
              <th className="border p-2">Fiyat</th>
              <th className="border p-2">KDV</th>
              <th className="border p-2">KDV Dahil</th>
              <th className="border p-2">Stok</th>
              <th className="border p-2">Para Birimi</th>
            </tr>
          </thead>
          <tbody>
            {urunler.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border p-6 text-center text-gray-500"
                >
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {urunler.map((u, i) => {
              const fiyat = Number(u.fiyat || 0);
              const kdv = Number(u.kdvOrani || 0);
              const toplam = fiyat + (fiyat * kdv) / 100;
              return (
                <tr key={u._id || i} className="hover:bg-orange-50/40">
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{u.ad}</td>
                  <td className="border p-2 text-right">
                    {fiyat.toLocaleString("tr-TR")} {u.paraBirimi}
                  </td>
                  <td className="border p-2">%{kdv}</td>
                  <td className="border p-2 text-right">
                    {toplam.toLocaleString("tr-TR")} {u.paraBirimi}
                  </td>
                  <td className="border p-2 text-right">{u.stok}</td>
                  <td className="border p-2">{u.paraBirimi}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
