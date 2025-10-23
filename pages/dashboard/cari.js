import { useState, useEffect } from "react";

export default function CariPanel() {
  const [activeTab, setActiveTab] = useState("cari");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center text-orange-600 mb-6">
        💼 Cari Yönetim Paneli
      </h1>

      {/* Sekme Butonları */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setActiveTab("cari")}
          className={`px-6 py-2 rounded-l-xl font-semibold border ${
            activeTab === "cari"
              ? "bg-orange-500 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Cari Kartları
        </button>
        <button
          onClick={() => setActiveTab("urunler")}
          className={`px-6 py-2 font-semibold border-t border-b ${
            activeTab === "urunler"
              ? "bg-orange-500 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Ürünler
        </button>
        <button
          onClick={() => setActiveTab("hareketler")}
          className={`px-6 py-2 rounded-r-xl font-semibold border ${
            activeTab === "hareketler"
              ? "bg-orange-500 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Cari Hareketler
        </button>
      </div>

      {/* Sekme İçerikleri */}
      <div className="bg-white rounded-xl shadow p-6 max-w-5xl mx-auto">
        {activeTab === "cari" && <CariKarti />}
        {activeTab === "urunler" && <Urunler />}
        {activeTab === "hareketler" && <CariHareketleri />}
      </div>
    </div>
  );
}

/* 🔸 Cari Kartları Sekmesi */
function CariKarti() {
  const [form, setForm] = useState({
    ad: "",
    tur: "Müşteri",
    telefon: "",
    email: "",
  });
  const [list, setList] = useState([]);

  const fetchData = async () => {
    const res = await fetch("/api/cari");
    const data = await res.json();
    setList(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("/api/cari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ad: "", tur: "Müşteri", telefon: "", email: "" });
    fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">📇 Cari Kartları</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Ad / Ünvan"
          value={form.ad}
          onChange={(e) => setForm({ ...form, ad: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <select
          value={form.tur}
          onChange={(e) => setForm({ ...form, tur: e.target.value })}
          className="border p-2 rounded"
        >
          <option>Müşteri</option>
          <option>Tedarikçi</option>
        </select>
        <input
          type="tel"
          placeholder="Telefon"
          value={form.telefon}
          onChange={(e) => setForm({ ...form, telefon: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="email"
          placeholder="E-posta"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="col-span-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition"
        >
          Kaydet
        </button>
      </form>

      <table className="w-full border-collapse border text-left">
        <thead className="bg-orange-100">
          <tr>
            <th className="border p-2">Ad / Ünvan</th>
            <th className="border p-2">Tür</th>
            <th className="border p-2">Telefon</th>
            <th className="border p-2">E-posta</th>
          </tr>
        </thead>
        <tbody>
          {list.map((cari, i) => (
            <tr key={i} className="hover:bg-orange-50">
              <td className="border p-2">{cari.ad}</td>
              <td className="border p-2">{cari.tur}</td>
              <td className="border p-2">{cari.telefon}</td>
              <td className="border p-2">{cari.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 🔸 Ürünler Sekmesi */
function Urunler() {
  const [urun, setUrun] = useState({ ad: "", fiyat: "", stok: "" });
  const [urunler, setUrunler] = useState([]);

  const fetchData = async () => {
    const res = await fetch("/api/urunler");
    const data = await res.json();
    setUrunler(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("/api/urunler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(urun),
    });
    setUrun({ ad: "", fiyat: "", stok: "" });
    fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">📦 Ürün Kayıt</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Ürün Adı"
          value={urun.ad}
          onChange={(e) => setUrun({ ...urun, ad: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Fiyat"
          value={urun.fiyat}
          onChange={(e) => setUrun({ ...urun, fiyat: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Stok"
          value={urun.stok}
          onChange={(e) => setUrun({ ...urun, stok: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="col-span-3 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition"
        >
          Ürünü Kaydet
        </button>
      </form>

      <table className="w-full border-collapse border text-left">
        <thead className="bg-orange-100">
          <tr>
            <th className="border p-2">Ürün Adı</th>
            <th className="border p-2">Fiyat</th>
            <th className="border p-2">Stok</th>
          </tr>
        </thead>
        <tbody>
          {urunler.map((u, i) => (
            <tr key={i} className="hover:bg-orange-50">
              <td className="border p-2">{u.ad}</td>
              <td className="border p-2">{u.fiyat} ₺</td>
              <td className="border p-2">{u.stok}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 🔸 Cari Hareketleri Sekmesi */
function CariHareketleri() {
  const [hareket, setHareket] = useState({
    aciklama: "",
    tutar: "",
    tur: "Satış",
  });
  const [list, setList] = useState([]);

  const fetchData = async () => {
    const res = await fetch("/api/hareketler");
    const data = await res.json();
    setList(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("/api/hareketler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hareket),
    });
    setHareket({ aciklama: "", tutar: "", tur: "Satış" });
    fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">📊 Cari Hareketler</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Açıklama"
          value={hareket.aciklama}
          onChange={(e) => setHareket({ ...hareket, aciklama: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Tutar"
          value={hareket.tutar}
          onChange={(e) => setHareket({ ...hareket, tutar: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <select
          value={hareket.tur}
          onChange={(e) => setHareket({ ...hareket, tur: e.target.value })}
          className="border p-2 rounded"
        >
          <option>Satış</option>
          <option>Alış</option>
          <option>Tahsilat</option>
          <option>Ödeme</option>
        </select>
        <button
          type="submit"
          className="col-span-3 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition"
        >
          Kaydet
        </button>
      </form>

      <table className="w-full border-collapse border text-left">
        <thead className="bg-orange-100">
          <tr>
            <th className="border p-2">Açıklama</th>
            <th className="border p-2">Tutar</th>
            <th className="border p-2">Tür</th>
          </tr>
        </thead>
        <tbody>
          {list.map((h, i) => (
            <tr key={i} className="hover:bg-orange-50">
              <td className="border p-2">{h.aciklama}</td>
              <td className="border p-2">{h.tutar} ₺</td>
              <td className="border p-2">{h.tur}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
