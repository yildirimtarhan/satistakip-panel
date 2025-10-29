// 📄 /pages/dashboard/cari.js
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* -------------------------------------------------------
   JWT Token Yenileme
------------------------------------------------------- */
async function refreshTokenIfNeeded() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    const now = Date.now();
    if (exp - now < 24 * 60 * 60 * 1000) {
      const res = await fetch("/api/auth/refresh", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.token) {
        localStorage.setItem("token", data.token);
        console.log("🔄 Token otomatik yenilendi");
      }
    }
  } catch (err) {
    console.warn("Token yenileme başarısız:", err);
  }
}

/* -------------------------------------------------------
   XLSX Yardımcı Fonksiyonları
------------------------------------------------------- */
function downloadXlsxFromJson(json, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(json);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Veriler");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName || "veriler.xlsx");
}

async function downloadExcelFromApi() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  try {
    const res = await fetch("/api/export/cari", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Export isteği başarısız");
    const blob = await res.blob();
    saveAs(blob, "cari_listesi.xlsx");
  } catch (e) {
    console.error("Export hata:", e);
    alert("Excel export sırasında bir hata oluştu.");
  }
}

async function uploadExcelToApi(file) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/import/cari", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Import başarısız");
  }
  return res.json();
}

/* -------------------------------------------------------
   Ana Panel Bileşeni
------------------------------------------------------- */
export default function CariPanel() {
  const [activeTab, setActiveTab] = useState("cari");
  useEffect(() => {
    refreshTokenIfNeeded();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center text-orange-600 mb-6">
        💼 Cari Yönetim Paneli
      </h1>

      {/* Sekmeler */}
      <div className="flex justify-center mb-6">
        {["cari", "urunler", "hareketler"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 border font-semibold ${
              activeTab === tab
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-600"
            } ${tab === "cari" ? "rounded-l-xl" : tab === "hareketler" ? "rounded-r-xl" : ""}`}
          >
            {tab === "cari"
              ? "Cari Kartları"
              : tab === "urunler"
              ? "Ürünler"
              : "Cari Hareketler"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto">
        {activeTab === "cari" && <CariKarti />}
        {activeTab === "urunler" && <Urunler />}
        {activeTab === "hareketler" && <CariHareketleri />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Cari Kartları Sekmesi
------------------------------------------------------- */
function CariKarti() {
  // (Tüm orijinal kodun korunmuş hali burada kalıyor)
  // ...
  // (Excel yükleme, form, liste, bakiye hesaplama, fetchData, handleSubmit, handleEdit, handleDelete)
  // ...
}

/* -------------------------------------------------------
   Ürünler Sekmesi
------------------------------------------------------- */
function Urunler() {
  // (Senin dosyandaki orijinal Urunler kodu)
  // ...
}

/* -------------------------------------------------------
   Cari Hareketleri Sekmesi (GÜNCELLENMİŞ)
------------------------------------------------------- */
function CariHareketleri() {
  const [hareket, setHareket] = useState({
    accountId: "",
    productId: "",
    type: "sale",
    quantity: "",
    unitPrice: "",
    currency: "TRY",
  });
  const [list, setList] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);

  // 🔹 Veriler
  const fetchCariler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCariler(Array.isArray(data) ? data : []);
  };

  const fetchUrunler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari/products", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUrunler(Array.isArray(data) ? data : []);
  };

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari/transactions", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCariler();
    fetchUrunler();
    fetchData();
  }, []);

  /* -------------------------------------------
     💾 KAYDET BUTONU (GÜNCELLENMİŞ)
  ------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        accountId: hareket.accountId,
        productId: hareket.productId || null,
        type: hareket.type,
        quantity: Number(hareket.quantity),
        unitPrice: Number(hareket.unitPrice),
        currency: hareket.currency,
      };

      const res = await fetch("/api/cari/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Hareket kaydetme hatası");

      alert(data?.message || "✅ İşlem başarıyla kaydedildi!");

      // 🔄 Listeyi yenile (cari + hareket)
      await fetchData();
      await fetchCariler();

      // 🧹 Formu sıfırla
      setHareket({
        accountId: "",
        productId: "",
        type: "sale",
        quantity: "",
        unitPrice: "",
        currency: "TRY",
      });
    } catch (e) {
      console.error("🔥 Hareket kaydetme hatası:", e);
      alert("❌ Hata: " + e.message);
    }
  };

  /* -------------------------------------------
     🧾 Ekran
  ------------------------------------------- */
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">📊 Cari Hareketler</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 mb-6">
        {/* Cari Seçimi */}
        <select
          className="border p-2 rounded col-span-12 md:col-span-3"
          value={hareket.accountId}
          onChange={(e) => setHareket({ ...hareket, accountId: e.target.value })}
          required
        >
          <option value="">Cari Seç *</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>{c.ad}</option>
          ))}
        </select>

        {/* Ürün Seçimi */}
        <select
          className="border p-2 rounded col-span-12 md:col-span-3"
          value={hareket.productId}
          onChange={(e) => setHareket({ ...hareket, productId: e.target.value })}
        >
          <option value="">Ürün (Opsiyonel)</option>
          {urunler.map((u) => (
            <option key={u._id} value={u._id}>{u.ad}</option>
          ))}
        </select>

        {/* Tür */}
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={hareket.type}
          onChange={(e) => setHareket({ ...hareket, type: e.target.value })}
        >
          <option value="sale">Satış</option>
          <option value="purchase">Alış</option>
        </select>

        {/* Miktar */}
        <input
          type="number"
          placeholder="Miktar"
          value={hareket.quantity}
          onChange={(e) => setHareket({ ...hareket, quantity: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />

        {/* Birim Fiyat */}
        <input
          type="number"
          placeholder="Birim Fiyat"
          value={hareket.unitPrice}
          onChange={(e) => setHareket({ ...hareket, unitPrice: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />

        {/* Para Birimi */}
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={hareket.currency}
          onChange={(e) => setHareket({ ...hareket, currency: e.target.value })}
        >
          <option value="TRY">TRY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
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

      {/* 🔽 Hareket Listesi */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="border p-2 w-14">#</th>
              <th className="border p-2">Cari</th>
              <th className="border p-2">Ürün</th>
              <th className="border p-2">Tür</th>
              <th className="border p-2">Miktar</th>
              <th className="border p-2">Birim Fiyat</th>
              <th className="border p-2">Tutar</th>
              <th className="border p-2">PB</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="border p-6 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {list.map((h, i) => (
              <tr key={h._id || i} className="hover:bg-orange-50/40">
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2">{h.account || "-"}</td>
                <td className="border p-2">{h.product || "-"}</td>
                <td
                  className={`border p-2 font-semibold ${
                    h.type === "sale"
                      ? "text-green-600"
                      : h.type === "purchase"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {h.type === "sale" ? "Satış" : h.type === "purchase" ? "Alış" : h.type}
                </td>
                <td className="border p-2 text-right">{h.quantity}</td>
                <td className="border p-2 text-right">
                  {Number(h.unitPrice || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </td>
                <td className="border p-2 text-right">
                  {Number(h.total || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </td>
                <td className="border p-2">{h.currency || "TRY"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
