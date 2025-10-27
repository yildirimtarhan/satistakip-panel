// 📄 /pages/dashboard/cari.js
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// 🔁 Token otomatik yenileme fonksiyonu (yakında bitecekse yeniler)
async function refreshTokenIfNeeded() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // UNIX timestamp → ms
    const now = Date.now();

    // Token'ın süresi bitmeye 1 günden az kaldıysa yenile
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
   XLSX Yardımcıları (Şablon, Export, Import)
------------------------------------------------------- */

// 📥 XLSX Şablonu oluşturup indir (genel amaçlı)
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

// 📤 /api/export/cari.js üzerinden indir
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

// 📥 /api/import/cari.js'e Excel yükle
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

      {/* Sekme Butonları */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setActiveTab("cari")}
          className={`px-6 py-2 rounded-l-xl font-semibold border ${activeTab === "cari" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}
        >
          Cari Kartları
        </button>
        <button
          onClick={() => setActiveTab("urunler")}
          className={`px-6 py-2 font-semibold border-t border-b ${activeTab === "urunler" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}
        >
          Ürünler
        </button>
        <button
          onClick={() => setActiveTab("hareketler")}
          className={`px-6 py-2 rounded-r-xl font-semibold border ${activeTab === "hareketler" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}
        >
          Cari Hareketler
        </button>
      </div>

      {/* Sekme İçerikleri */}
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
    vergiTipi: "TCKN",        // TCKN | VKN
    vergiNo: "",
    paraBirimi: "TRY",        // TRY | USD | EUR
    kdvOrani: 20,             // %1, %10, %20
    adres: "",
    il: "",
    ilce: "",
    postaKodu: "",
    profileUrl: "",           // (Demo: DataURL/URL – backend'e yollama opsiyonel)
  });

  const [list, setList] = useState([]);

  // 🧮 Bakiye bilgisini tut (her cari için)
  const [balances, setBalances] = useState({}); // {cariId: {alacak: number, borc: number, bakiye: number}}

  // Profil foto dosyası seç
  const onChooseFile = () => fileInputRef.current?.click();

  // Profil foto preview (isteğe bağlı)
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

  // Listeyi çek
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cari", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Cari getirme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  // Belirli cari için hareketleri çekip bakiye hesapla
  const fetchCariBakiye = async (cariId) => {
    try {
      const token = localStorage.getItem("token");
      const url = `/api/cari/transactions?cariId=${encodeURIComponent(cariId)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const items = await res.json();

      let borc = 0;    // bizden alacaklı olduğu tutar (bizim borcumuz)
      let alacak = 0;  // bizim alacaklı olduğumuz tutar (onların borcu)

      (items || []).forEach((t) => {
        // örnek türler: "Satış" => alacak artar, "Alış" => borç artar,
        // "Tahsilat" => alacak azalır, "Ödeme" => borç azalır
        const val = Number(t.tutar || 0);
        if (t.tur === "Satış") alacak += val;
        else if (t.tur === "Alış") borc += val;
        else if (t.tur === "Tahsilat") alacak -= val;
        else if (t.tur === "Ödeme") borc -= val;
      });

      const bakiye = alacak - borc; // (+) alacaklıyız, (-) borçluyuz

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

  // Tüm cariler için bakiye topla
  const refreshAllBalances = async (arr) => {
    for (const c of arr) {
      if (c?._id) await fetchCariBakiye(c._id);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (list.length) refreshAllBalances(list);
  }, [list]);

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

  // Kaydet / Güncelle
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
        tur: "Müşteri",       // Müşteri | Tedarikçi
        telefon: "05051234567",
        email: "ahmet@mail.com",
        vergiTipi: "TCKN",    // TCKN | VKN
        vergiNo: "12345678901",
        paraBirimi: "TRY",    // TRY | USD | EUR
        kdvOrani: 20,         // 1 | 10 | 20
        adres: "Atatürk Cd. No:5",
        il: "İstanbul",
        ilce: "Kadıköy",
        postaKodu: "34714",
      },
    ];
    downloadXlsxFromJson(sample, "Cari Şablon", "cari_sablon.xlsx");
  };

  // 📥 Excel içe aktar – buton tetikleyici
  const onChooseExcel = () => excelUploadRef.current?.click();

  // 📤 Excel içe aktar – dosya seçilince otomatik yükle
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
      // aynı dosyayı tekrar seçebilmek için input'u sıfırla
      if (excelUploadRef.current) excelUploadRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Araç Çubuğu */}
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

        {/* Filtreler */}
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
            onChange={(e) => setFilters((f) => ({ ...f, paraBirimi: e.target.value }))}
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

      {/* Cari Formu */}
      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4">
        {/* Sol: Profil ve iletişim */}
        <div className="col-span-12 md:col-span-4">
          <div className="border rounded-xl p-4 h-full">
            <div className="flex items-center gap-4">
              <img
                src={preview || "/images/default-profile.png"}
                alt="Profil"
                className="w-16 h-16 rounded-full border object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-profile.png";
                }}
              />
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onChooseFile}
                  className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
                >
                  📸 Fotoğraf Yükle
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

            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Ad / Ünvan *"
                value={form.ad}
                onChange={(e) => setForm({ ...form, ad: e.target.value })}
                className="border p-2 rounded w-full"
                required
              />
              <select
                value={form.tur}
                onChange={(e) => setForm({ ...form, tur: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option>Müşteri</option>
                <option>Tedarikçi</option>
              </select>

              <input
                type="tel"
                placeholder="Telefon"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                className="border p-2 rounded w-full"
              />
              <input
                type="email"
                placeholder="E-posta"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>
        </div>

        {/* Orta: Vergi ve para birimi */}
        <div className="col-span-12 md:col-span-4">
          <div className="border rounded-xl p-4 h-full space-y-3">
            <div className="flex gap-2">
              <select
                className="border p-2 rounded w-28"
                value={form.vergiTipi}
                onChange={(e) => setForm({ ...form, vergiTipi: e.target.value })}
              >
                <option value="TCKN">TCKN</option>
                <option value="VKN">VKN</option>
              </select>
              <input
                type="text"
                placeholder={form.vergiTipi === "TCKN" ? "TC Kimlik No" : "Vergi No"}
                value={form.vergiNo}
                onChange={(e) => setForm({ ...form, vergiNo: e.target.value })}
                className="border p-2 rounded flex-1"
              />
            </div>

            <div className="flex gap-2">
              <select
                className="border p-2 rounded w-28"
                value={form.paraBirimi}
                onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>

              <select
                className="border p-2 rounded w-28"
                value={form.kdvOrani}
                onChange={(e) => setForm({ ...form, kdvOrani: Number(e.target.value) })}
              >
                {KDV_RATES.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>

              <div className="border rounded p-2 text-sm text-gray-600 flex-1">
                <div>KDV Oranı: <b>%{form.kdvOrani}</b></div>
                <div>Para Birimi: <b>{form.paraBirimi}</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ: Adres */}
        <div className="col-span-12 md:col-span-4">
          <div className="border rounded-xl p-4 h-full space-y-3">
            <textarea
              placeholder="Adres"
              value={form.adres}
              onChange={(e) => setForm({ ...form, adres: e.target.value })}
              rows={4}
              className="border p-2 rounded w-full"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="İl"
                className="border p-2 rounded"
                value={form.il}
                onChange={(e) => setForm({ ...form, il: e.target.value })}
              />
              <input
                placeholder="İlçe"
                className="border p-2 rounded"
                value={form.ilce}
                onChange={(e) => setForm({ ...form, ilce: e.target.value })}
              />
            </div>
            <input
              placeholder="Posta Kodu"
              className="border p-2 rounded w-32"
              value={form.postaKodu}
              onChange={(e) => setForm({ ...form, postaKodu: e.target.value })}
            />
          </div>
        </div>

        <div className="col-span-12 flex flex-wrap gap-3 justify-end">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded border bg-white hover:bg-gray-50"
            >
              İptal
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            {editingId ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>

      {/* Liste */}
      <div className="border rounded-xl overflow-hidden">
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
            {!loading && filtered(list, filters).length === 0 && (
              <tr>
                <td colSpan={8} className="border p-6 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              filtered(list, filters).map((cari, i) => {
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
                    <td className="border p-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={cari.profileUrl || "/images/default-profile.png"}
                          className="w-10 h-10 rounded-full border object-cover"
                          onError={(e) => (e.currentTarget.src = "/images/default-profile.png")}
                          alt=""
                        />
                        <div>
                          <div className="font-semibold">{cari.ad}</div>
                          <div className="text-xs text-gray-500">{cari.tur}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border p-2">
                      <div className="text-sm">{cari.telefon || "-"}</div>
                      <div className="text-xs text-gray-500">{cari.email || "-"}</div>
                    </td>
                    <td className="border p-2">
                      <div className="text-sm">{cari.vergiTipi || "-"}: {cari.vergiNo || "-"}</div>
                    </td>
                    <td className="border p-2">
                      <div className="text-sm">{cari.paraBirimi || "-"}</div>
                      <div className="text-xs text-gray-500">KDV: %{Number(cari.kdvOrani ?? 0)}</div>
                    </td>
                    <td className="border p-2">
                      <div className="text-sm">{cari.adres || "-"}</div>
                      <div className="text-xs text-gray-500">
                        {(cari.il || "-")}, {(cari.ilce || "-")} {(cari.postaKodu || "")}
                      </div>
                    </td>
                    <td className="border p-2">
                      <div className={`inline-flex px-2 py-1 rounded ${badge}`}>
                        {bal.bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {cari.paraBirimi || "TRY"}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        A:{bal.alacak.toLocaleString("tr-TR")} / B:{bal.borc.toLocaleString("tr-TR")}
                      </div>
                    </td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(cari)}
                          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(cari._id)}
                          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                        >
                          🗑️ Sil
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

// Basit filtreleme (client-side) — fonksiyona çıkarıldı
function filtered(list, filters) {
  const q = (filters.q || "").toLowerCase().trim();
  return list.filter((c) => {
    const okQ =
      !q ||
      (c.ad || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.telefon || "").toLowerCase().includes(q) ||
      (c.il || "").toLowerCase().includes(q) ||
      (c.ilce || "").toLowerCase().includes(q);

    const okTur = !filters.tur || c.tur === filters.tur;
    const okPB = !filters.paraBirimi || c.paraBirimi === filters.paraBirimi;
    const okIl = !filters.il || (c.il || "").toLowerCase().includes((filters.il || "").toLowerCase());
    const okIlce = !filters.ilce || (c.ilce || "").toLowerCase().includes((filters.ilce || "").toLowerCase());

    return okQ && okTur && okPB && okIl && okIlce;
  });
}

/* 🔸 ÜRÜNLER */
function Urunler() {
  const [urun, setUrun] = useState({
    ad: "",
    fiyat: "",
    stok: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
  });

  const [urunler, setUrunler] = useState([]);
  const fileInputRef = useRef(null);

  const onDownloadProductTemplate = () => {
    const sample = [
      {
        ad: "Laptop",
        fiyat: 25000,
        stok: 15,
        paraBirimi: "TRY",
        kdvOrani: 20,
      },
    ];
    downloadXlsxFromJson(sample, "Ürün Şablon", "urun_sablon.xlsx");
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cari/products", {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = { ...urun, fiyat: Number(urun.fiyat), stok: Number(urun.stok) };

      const res = await fetch("/api/cari/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Ürün kaydetme hatası");
      setUrun({ ad: "", fiyat: "", stok: "", paraBirimi: "TRY", kdvOrani: 20 });
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
        <button
          type="button"
          onClick={() => alert("Excel içe aktarma için /api/import/urun hazırsa etkinleştirilebilir.")}
          className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
        >
          📤 Excel'den Ürün Yükle
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 space-y-3">
          <input
            type="text"
            placeholder="Ürün Adı *"
            value={urun.ad}
            onChange={(e) => setUrun({ ...urun, ad: e.target.value })}
            className="border p-2 rounded w-full"
            required
          />
          <div className="grid grid-cols-3 gap-3">
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
            <select
              className="border p-2 rounded"
              value={urun.paraBirimi}
              onChange={(e) => setUrun({ ...urun, paraBirimi: e.target.value })}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="border p-2 rounded w-32"
              value={urun.kdvOrani}
              onChange={(e) => setUrun({ ...urun, kdvOrani: Number(e.target.value) })}
            >
              {KDV_RATES.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-600">
              KDV Dahil Fiyat:{" "}
              <b>
                {(() => {
                  const f = Number(urun.fiyat || 0);
                  const k = Number(urun.kdvOrani || 0);
                  const toplam = f + (f * k) / 100;
                  return toplam.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                })()}{" "}
                {urun.paraBirimi}
              </b>
            </div>
          </div>
        </div>

        <div className="col-span-12 flex items-end justify-end">
          <button type="submit" className="px-5 py-2 rounded bg-orange-500 text-white hover:bg-orange-600">
            Ürünü Kaydet
          </button>
        </div>
      </form>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="border p-2 w-14">#</th>
              <th className="border p-2">Ürün</th>
              <th className="border p-2">Fiyat</th>
              <th className="border p-2">KDV</th>
              <th className="border p-2">KDV Dahil</th>
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
            {urunler.map((u, i) => {
              const fiyat = Number(u.fiyat || 0);
              const kdv = Number(u.kdvOrani || 0);
              const toplam = fiyat + (fiyat * kdv) / 100;
              return (
                <tr key={u._id || i} className="hover:bg-orange-50/40">
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2 font-medium">{u.ad}</td>
                  <td className="border p-2">
                    {fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {u.paraBirimi || "TRY"}
                  </td>
                  <td className="border p-2">%{kdv}</td>
                  <td className="border p-2">
                    {toplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {u.paraBirimi || "TRY"}
                  </td>
                  <td className="border p-2">{u.stok}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 🔸 CARI HAREKETLERI */
function CariHareketleri() {
  const [hareket, setHareket] = useState({
    cariId: "",
    aciklama: "",
    tutar: "",
    tur: "Satış",
  });
  const [list, setList] = useState([]);
  const [cariler, setCariler] = useState([]);

  const fetchCariler = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cari", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCariler(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Cari listesi hatası:", e);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cari/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Hareket getirme hatası:", e);
    }
  };

  useEffect(() => {
    fetchCariler();
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = { ...hareket, tutar: Number(hareket.tutar) };
      const res = await fetch("/api/cari/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Hareket kaydetme hatası");
      setHareket({ cariId: "", aciklama: "", tutar: "", tur: "Satış" });
      await fetchData();
    } catch (e) {
      console.error("Hareket kaydetme hatası:", e);
      alert("Hareket kaydı sırasında bir hata oluştu.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">📊 Cari Hareketler</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 mb-6">
        <select
          className="border p-2 rounded col-span-12 md:col-span-3"
          value={hareket.cariId}
          onChange={(e) => setHareket({ ...hareket, cariId: e.target.value })}
          required
        >
          <option value="">Cari Seç *</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Açıklama"
          value={hareket.aciklama}
          onChange={(e) => setHareket({ ...hareket, aciklama: e.target.value })}
          className="border p-2 rounded col-span-12 md:col-span-4"
          required
        />
        <input
          type="number"
          placeholder="Tutar"
          value={hareket.tutar}
          onChange={(e) => setHareket({ ...hareket, tutar: e.target.value })}
          className="border p-2 rounded col-span-6 md:col-span-2"
          required
        />
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={hareket.tur}
          onChange={(e) => setHareket({ ...hareket, tur: e.target.value })}
        >
          <option>Satış</option>
          <option>Alış</option>
          <option>Tahsilat</option>
          <option>Ödeme</option>
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

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="border p-2 w-14">#</th>
              <th className="border p-2">Cari</th>
              <th className="border p-2">Açıklama</th>
              <th className="border p-2">Tutar</th>
              <th className="border p-2">Tür</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="border p-6 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {list.map((h, i) => {
              const cari = cariler.find((c) => c._id === h.cariId);
              return (
                <tr key={h._id || i} className="hover:bg-orange-50/40">
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{cari?.ad || "-"}</td>
                  <td className="border p-2">{h.aciklama}</td>
                  <td className="border p-2">
                    {Number(h.tutar || 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {cari?.paraBirimi || "TRY"}
                  </td>
                  <td className="border p-2">{h.tur}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
