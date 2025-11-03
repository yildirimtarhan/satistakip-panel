"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export default function CariTahsilat() {
  const [cariler, setCariler] = useState([]);
  const [list, setList] = useState([]);

  const [form, setForm] = useState({
    accountId: "",
    type: "tahsilat",
    amount: "",
    note: "",
  });

  const token = Cookies.get("token");

  // ✅ Carileri çek
  const fetchCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCariler(data || []);
  };

  // ✅ Tahsilat/Ödeme listesi
  const fetchList = async () => {
    const res = await fetch("/api/tahsilat", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setList(data || []);
  };

  useEffect(() => {
    fetchCariler();
    fetchList();
  }, []);

  // ✅ Kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accountId || !form.amount)
      return alert("⚠️ Cari ve tutar zorunlu");

    const res = await fetch("/api/tahsilat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    alert("✅ Kayıt başarıyla eklendi");

    setForm({ accountId: "", type: "tahsilat", amount: "", note: "" });
    fetchList();
    window.dispatchEvent(new CustomEvent("refresh-accounts"));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-6">
        💰 Cari Tahsilat & Ödeme
      </h1>

      {/* ✅ Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow grid grid-cols-12 gap-4 mb-8">

        <select
          className="border p-2 rounded col-span-4"
          value={form.accountId}
          onChange={(e) => setForm({ ...form, accountId: e.target.value })}
        >
          <option value="">Cari Seç *</option>
          {cariler.map(c => <option key={c._id} value={c._id}>{c.ad}</option>)}
        </select>

        <select
          className="border p-2 rounded col-span-2"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="tahsilat">Tahsilat (Para Alma)</option>
          <option value="odeme">Ödeme (Para Verme)</option>
        </select>

        <input
          type="number"
          placeholder="Tutar *"
          className="border p-2 rounded col-span-3"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        <input
          placeholder="Not (Opsiyonel)"
          className="border p-2 rounded col-span-3"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        <button className="col-span-12 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded">
          Kaydet ✅
        </button>
      </form>

      {/* ✅ Kayıt Tablosu */}
      <table className="w-full text-sm bg-white rounded-xl shadow">
        <thead className="bg-orange-100">
          <tr>
            <th className="p-2">Cari</th>
            <th className="p-2">Tür</th>
            <th className="p-2">Tutar</th>
            <th className="p-2">Not</th>
            <th className="p-2">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{t.cari}</td>
              <td className={`p-2 font-bold ${t.type === "tahsilat" ? "text-green-600" : "text-red-600"}`}>
                {t.type === "tahsilat" ? "Tahsilat" : "Ödeme"}
              </td>
              <td className="p-2">₺{Number(t.amount).toLocaleString("tr-TR")}</td>
              <td className="p-2">{t.note || "-"}</td>
              <td className="p-2">{new Date(t.date).toLocaleString("tr-TR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
