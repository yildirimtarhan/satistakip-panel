// 📄 /pages/dashboard/cari.js
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// 🔁 Token otomatik yenileme fonksiyonu
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

const KDV_RATES = [
  { label: "%1", value: 1 },
  { label: "%10", value: 10 },
  { label: "%20", value: 20 },
];

/* -------------------------------------------------------
   XLSX Yardımcıları
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

// 🔤 Hareket türünü Türkçeleştirme fonksiyonu
function trTur(type) {
  if (!type) return "-";
  const map = { sale: "Satış", purchase: "Alış" };
  return map[type] || type;
}

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

      <div className="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto">
        {activeTab === "cari" && <CariKarti />}
        {activeTab === "urunler" && <Urunler />}
        {activeTab === "hareketler" && <CariHareketleri />}
      </div>
    </div>
  );
}
/* 🔸 CARI KARTLARI */
function CariKarti() {
  const fileInputRef = useRef(null);
  const excelUploadRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({
    q: "",
    tur: "",
    paraBirimi: "",
    il: "",
    ilce: "",
  });

  const [form, setForm] = useState({
    ad: "",
    tur: "Müşteri",
    telefon: "",
    email: "",
    vergiTipi: "TCKN",
    vergiNo: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
    adres: "",
    il: "",
    ilce: "",
    postaKodu: "",
    profileUrl: "",
  });

  const [list, setList] = useState([]);
  const [balances, setBalances] = useState({});

  const onChooseFile = () => fileInputRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setForm((f) => ({ ...f, profileUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // 🔄 Cari verilerini API'den çek
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cari", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const cariler = Array.isArray(data) ? data : [];
      setList(cariler);

      const balanceMap = {};
      cariler.forEach((c) => {
        balanceMap[c._id] = {
          bakiye: c.balance || 0,
          alacak: c.totalSales || 0,
          borc: c.totalPurchases || 0,
        };
      });
      setBalances(balanceMap);
    } catch (e) {
      console.error("Cari getirme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Belirli cari için bakiye hesapla
  const fetchCariBakiye = async (cariId) => {
    try {
      const token = localStorage.getItem("token");
      const url = `/api/cari/transactions?cariId=${encodeURIComponent(cariId)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const items = await res.json();

      let borc = 0;
      let alacak = 0;

      (items || []).forEach((t) => {
        const val = Number(t.tutar || 0);
        if (t.tur === "Satış") alacak += val;
        else if (t.tur === "Alış") borc += val;
        else if (t.tur === "Tahsilat") alacak -= val;
        else if (t.tur === "Ödeme") borc -= val;
      });

      const bakiye = alacak - borc;

      setBalances((b) => ({
        ...b,
        [cariId]: {
          alacak: Math.max(alacak, 0),
          borc: Math.max(borc, 0),
          bakiye,
        },
      }));
    } catch (e) {
      console.error("Bakiye hesaplama hatası:", e);
    }
  };

  // 🔁 Tüm cariler için bakiye topla
  const refreshAllBalances = async (arr) => {
    for (const c of arr) {
      if (c?._id) await fetchCariBakiye(c._id);
    }
  };

  // 🧭 İlk yüklemede cari verilerini getir
  useEffect(() => {
    fetchData();
  }, []);

  // 🔁 Cari listesi değiştiğinde tüm bakiyeleri yenile
  useEffect(() => {
    if (list.length) refreshAllBalances(list);
  }, [list]);

  // 🆕 Cari hareket kaydedildiğinde güncelle
  useEffect(() => {
    const onRefresh = () => fetchData();
    window.addEventListener("refresh-accounts", onRefresh);
    return () => window.removeEventListener("refresh-accounts", onRefresh);
  }, []);

  const resetForm = () => {
    setForm({
      ad: "",
      tur: "Müşteri",
      telefon: "",
      email: "",
      vergiTipi: "TCKN",
      vergiNo: "",
      paraBirimi: "TRY",
      kdvOrani: 20,
      adres: "",
      il: "",
      ilce: "",
      postaKodu: "",
      profileUrl: "",
    });
    setPreview(null);
    setEditingId(null);
  };
  // 💾 Kaydet / Güncelle
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = { ...form };

      let url = "/api/cari";
      let method = "POST";
      if (editingId) {
        url = `/api/cari?cariId=${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Cari kaydı başarısız");
      await fetchData();
      resetForm();
    } catch (e) {
      console.error("Cari kaydetme hatası:", e);
      alert("Cari kaydı sırasında bir hata oluştu.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setPreview(item.profileUrl || null);
    setForm({
      ad: item.ad || "",
      tur: item.tur || "Müşteri",
      telefon: item.telefon || "",
      email: item.email || "",
      vergiTipi: item.vergiTipi || "TCKN",
      vergiNo: item.vergiNo || "",
      paraBirimi: item.paraBirimi || "TRY",
      kdvOrani: Number(item.kdvOrani ?? 20),
      adres: item.adres || "",
      il: item.il || "",
      ilce: item.ilce || "",
      postaKodu: item.postaKodu || "",
      profileUrl: item.profileUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu cari kartı silinsin mi?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/cari?cariId=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Silme başarısız");
      await fetchData();
    } catch (e) {
      console.error("Silme hatası:", e);
      alert("Cari silinirken hata oluştu.");
    }
  };

  // 📥 Cari XLSX Şablon İndir
  const onDownloadCariTemplate = () => {
    const sample = [
      {
        ad: "Ahmet Yılmaz",
        tur: "Müşteri",
        telefon: "05051234567",
        email: "ahmet@mail.com",
        vergiTipi: "TCKN",
        vergiNo: "12345678901",
        paraBirimi: "TRY",
        kdvOrani: 20,
        adres: "Atatürk Cd. No:5",
        il: "İstanbul",
        ilce: "Kadıköy",
        postaKodu: "34714",
      },
    ];
    downloadXlsxFromJson(sample, "Cari Şablon", "cari_sablon.xlsx");
  };

  // 📥 Excel içe aktar
  const onChooseExcel = () => excelUploadRef.current?.click();

  const onExcelSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      await uploadExcelToApi(file);
      await fetchData();
      alert("Excel import başarılı.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Excel içe aktarma hatası.");
    } finally {
      setLoading(false);
      if (excelUploadRef.current) excelUploadRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* 📋 Araç Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDownloadCariTemplate}
            className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
          >
            📥 Cari Şablonu (XLSX)
          </button>

          <button
            type="button"
            onClick={onChooseExcel}
            className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
          >
            📤 Excel'den Cari Yükle
          </button>
          <input
            ref={excelUploadRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={onExcelSelected}
          />

          <button
            type="button"
            onClick={downloadExcelFromApi}
            className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
          >
            ⬇️ Excel İndir (Export)
          </button>
        </div>

        {/* 🔍 Filtreler */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Ara (ad, email, tel...)"
            className="border rounded px-2 py-1"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
          <select
            className="border rounded px-2 py-1"
            value={filters.tur}
            onChange={(e) => setFilters((f) => ({ ...f, tur: e.target.value }))}
          >
            <option value="">Tür (Hepsi)</option>
            <option value="Müşteri">Müşteri</option>
            <option value="Tedarikçi">Tedarikçi</option>
          </select>
          <select
            className="border rounded px-2 py-1"
            value={filters.paraBirimi}
            onChange={(e) =>
              setFilters((f) => ({ ...f, paraBirimi: e.target.value }))
            }
          >
            <option value="">PB (Hepsi)</option>
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <input
            placeholder="İl"
            className="border rounded px-2 py-1 w-28"
            value={filters.il}
            onChange={(e) => setFilters((f) => ({ ...f, il: e.target.value }))}
          />
          <input
            placeholder="İlçe"
            className="border rounded px-2 py-1 w-28"
            value={filters.ilce}
            onChange={(e) => setFilters((f) => ({ ...f, ilce: e.target.value }))}
          />
        </div>
      </div>
      {/* 🧾 Cari Formu ve Liste */}
      {/* ... (önceki form kısmı buraya kadar geldi, devamında tablo) */}
      <div className="border rounded-xl overflow-hidden mt-4">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="border p-2 w-14">#</th>
              <th className="border p-2">Cari</th>
              <th className="border p-2">İletişim</th>
              <th className="border p-2">Vergi</th>
              <th className="border p-2">PB / KDV</th>
              <th className="border p-2">Adres</th>
              <th className="border p-2">Bakiye</th>
              <th className="border p-2 w-40">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="border p-4 text-center text-gray-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={8} className="border p-6 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              list.map((cari, i) => {
                const bal = balances[cari._id] || { alacak: 0, borc: 0, bakiye: 0 };
                const badge =
                  bal.bakiye > 0
                    ? "bg-green-100 text-green-700"
                    : bal.bakiye < 0
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700";

                return (
                  <tr key={cari._id || i} className="hover:bg-orange-50/40">
                    <td className="border p-2 text-center">{i + 1}</td>
                    <td className="border p-2 font-semibold">{cari.ad}</td>
                    <td className="border p-2 text-sm">
                      {cari.telefon || "-"}
                      <div className="text-xs text-gray-500">{cari.email || ""}</div>
                    </td>
                    <td className="border p-2">{cari.vergiTipi || "-"}: {cari.vergiNo || "-"}</td>
                    <td className="border p-2">
                      {cari.paraBirimi} <div className="text-xs text-gray-500">%{cari.kdvOrani}</div>
                    </td>
                    <td className="border p-2 text-xs">{cari.adres || "-"} {cari.il}/{cari.ilce}</td>
                    <td className={`border p-2 text-right ${badge}`}>
                      {bal.bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {cari.paraBirimi}
                    </td>
                    <td className="border p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(cari)}
                          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(cari._id)}
                          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => fetchCariBakiye(cari._id)}
                          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                          title="Bakiyeyi güncelle"
                        >
                          🔄
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 🔸 ÜRÜNLER */
/* 🔸 ÜRÜNLER (Barkod + SKU + Görsel eklendi) */
function Urunler() {
  const [urun, setUrun] = useState({
    ad: "",
    barkod: "",
    sku: "",
    fiyat: "",
    stok: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
    resimUrl: "",
  });

  const [urunler, setUrunler] = useState([]);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  // 📸 Görsel seçme
  const onChooseFile = () => fileInputRef.current?.click();
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setUrun((f) => ({ ...f, resimUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // 📥 Ürün şablonu indir
  const onDownloadProductTemplate = () => {
    const sample = [
      {
        ad: "Laptop",
        barkod: "8691234567890",
        sku: "LP123-256",
        fiyat: 25000,
        stok: 15,
        paraBirimi: "TRY",
        kdvOrani: 20,
      },
    ];
    downloadXlsxFromJson(sample, "Ürün Şablon", "urun_sablon.xlsx");
  };

  // 🔄 Ürünleri çek
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/urunler", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUrunler(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Ürün getirme hatası:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 💾 Kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ad: urun.ad,
        barkod: urun.barkod || "",
        sku: urun.sku || "",
        fiyat: Number(urun.fiyat),
        stok: Number(urun.stok),
        paraBirimi: urun.paraBirimi,
        kdvOrani: Number(urun.kdvOrani),
        resimUrl: urun.resimUrl || "",
      };

      const res = await fetch("/api/urunler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Ürün kaydetme hatası");

      alert("✅ Ürün başarıyla kaydedildi!");
      setUrun({
        ad: "",
        barkod: "",
        sku: "",
        fiyat: "",
        stok: "",
        paraBirimi: "TRY",
        kdvOrani: 20,
        resimUrl: "",
      });
      setPreview(null);
      await fetchData();
    } catch (e) {
      console.error("Ürün kaydetme hatası:", e);
      alert("Ürün kaydı sırasında bir hata oluştu.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDownloadProductTemplate}
          className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
        >
          📥 Ürün Şablonu (XLSX)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4">
        {/* Sol sütun */}
        <div className="col-span-12 md:col-span-4 space-y-3">
          <div className="border rounded-xl p-4">
            <div className="flex flex-col items-center space-y-3">
              <img
                src={preview || "/images/default-product.png"}
                alt="Ürün Görseli"
                className="w-24 h-24 rounded-xl border object-cover"
                onError={(e) => (e.currentTarget.src = "/images/default-product.png")}
              />
              <button
                type="button"
                onClick={onChooseFile}
                className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
              >
                📸 Görsel Yükle
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onFileChange}
              />
            </div>
          </div>
        </div>

        {/* Orta sütun */}
        <div className="col-span-12 md:col-span-4 space-y-3">
          <input
            type="text"
            placeholder="Ürün Adı *"
            value={urun.ad}
            onChange={(e) => setUrun({ ...urun, ad: e.target.value })}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="text"
            placeholder="Barkod"
            value={urun.barkod}
            onChange={(e) => setUrun({ ...urun, barkod: e.target.value })}
            className="border p-2 rounded w-full"
          />
          <input
            type="text"
            placeholder="SKU / Stok Kodu"
            value={urun.sku}
            onChange={(e) => setUrun({ ...urun, sku: e.target.value })}
            className="border p-2 rounded w-full"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Fiyat"
              value={urun.fiyat}
              onChange={(e) => setUrun({ ...urun, fiyat: e.target.value })}
              className="border p-2 rounded flex-1"
              required
            />
            <input
              type="number"
              placeholder="Stok"
              value={urun.stok}
              onChange={(e) => setUrun({ ...urun, stok: e.target.value })}
              className="border p-2 rounded w-28"
              required
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border p-2 rounded w-28"
              value={urun.paraBirimi}
              onChange={(e) => setUrun({ ...urun, paraBirimi: e.target.value })}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <select
              className="border p-2 rounded w-28"
              value={urun.kdvOrani}
              onChange={(e) => setUrun({ ...urun, kdvOrani: Number(e.target.value) })}
            >
              {KDV_RATES.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sağ sütun: Kaydet butonu */}
        <div className="col-span-12 md:col-span-4 flex items-end justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            💾 Ürünü Kaydet
          </button>
        </div>
      </form>

      {/* Liste */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">Görsel</th>
              <th className="border p-2">Ad</th>
              <th className="border p-2">Barkod / SKU</th>
              <th className="border p-2">Fiyat</th>
              <th className="border p-2">Stok</th>
            </tr>
          </thead>
          <tbody>
            {urunler.length === 0 && (
              <tr>
                <td colSpan={6} className="border p-6 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {urunler.map((u, i) => (
              <tr key={u._id || i} className="hover:bg-orange-50/40">
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2 text-center">
                  <img
                    src={u.resimUrl || "/images/default-product.png"}
                    className="w-12 h-12 object-cover rounded"
                    alt=""
                    onError={(e) => (e.currentTarget.src = "/images/default-product.png")}
                  />
                </td>
                <td className="border p-2">{u.ad}</td>
                <td className="border p-2">
                  <div>{u.barkod || "-"}</div>
                  <div className="text-xs text-gray-500">{u.sku || "-"}</div>
                </td>
                <td className="border p-2 text-right">
                  {Number(u.fiyat || 0).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {u.paraBirimi || "TRY"}
                </td>
                <td className="border p-2 text-center">{u.stok}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 🔸 CARI HAREKETLERI */
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

  const fetchCariler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } });
    setCariler(await res.json());
  };

  const fetchUrunler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari/products", { headers: { Authorization: `Bearer ${token}` } });
    setUrunler(await res.json());
  };

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari/transactions", { headers: { Authorization: `Bearer ${token}` } });
    setList(await res.json());
  };

  useEffect(() => {
    fetchCariler();
    fetchUrunler();
    fetchData();
  }, []);

  useEffect(() => {
    const onRefresh = () => fetchData();
    window.addEventListener("refresh-accounts", onRefresh);
    return () => window.removeEventListener("refresh-accounts", onRefresh);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) return alert("❌ " + data.message);
    alert(data.message);

    await fetchData();
    window.dispatchEvent(new CustomEvent("refresh-accounts"));
    setHareket({ accountId: "", productId: "", type: "sale", quantity: "", unitPrice: "", currency: "TRY" });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">📊 Cari Hareketler</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 mb-6">
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
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={hareket.type}
          onChange={(e) => setHareket({ ...hareket, type: e.target.value })}
        >
          <option value="sale">Satış</option>
          <option value="purchase">Alış</option>
        </select>
        <input
          type="number"
          placeholder="Miktar"
          value={hareket.quantity}
          onChange={(e) => setHareket({ ...hareket, quantity: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />
        <input
          type="number"
          placeholder="Birim Fiyat"
          value={hareket.unitPrice}
          onChange={(e) => setHareket({ ...hareket, unitPrice: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />
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
          <button type="submit" className="px-5 py-2 rounded bg-orange-500 text-white hover:bg-orange-600">
            Kaydet
          </button>
        </div>
      </form>

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
            {list.map((h, i) => (
              <tr key={h._id || i} className="hover:bg-orange-50/40">
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2">{h.account || "-"}</td>
                <td className="border p-2">{h.product || "-"}</td>
                <td className="border p-2 capitalize">{trTur(h.type)}</td>
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
