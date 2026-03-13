// 📄 /pages/dashboard/cariler.js
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Link from "next/link";

export default function Cariler() {
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [cariler, setCariler] = useState([]);
  const [activeTab, setActiveTab] = useState("form");
  const [detail, setDetail] = useState(null); // ✅ Cari detay modal

  const emptyForm = {
    ad: "",
    tur: "Müşteri",
    telefon: "",
    email: "",
    vergiTipi: "TCKN",
    vergiNo: "",
    vergiDairesi: "", // 🆕 Vergi Dairesi
    adres: "",
    il: "",
    ilce: "",
    postaKodu: "",
    paraBirimi: "TRY",
    trendyolCustomerId: "",
    hbCustomerId: "",
    n11CustomerId: "", // 🆕 N11
    amazonCustomerId: "", // 🆕 Amazon
    pttCustomerId: "", // 🆕 PTT AVM
    idefixCustomerId: "", // 🆕 İdefix / D&R
    ciceksepetiCustomerId: "", // 🆕 ÇiçekSepeti
  };

  const [form, setForm] = useState(emptyForm);

  // 🔁 Cari listesi çek
  const fetchCariler = async () => {
    try {
      const res = await fetch("/api/cari", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setCariler(data || []);
    } catch (err) {
      console.error("Cari listesi alınamadı:", err);
    }
  };

  useEffect(() => {
    fetchCariler();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveCari = async (e) => {
    e.preventDefault();
    setLoading(true);

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/cari?cariId=${editingId}` : "/api/cari";

    try {
      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });

      await fetchCariler();
      resetForm();
      alert("✅ Cari kaydedildi");
    } catch (err) {
      console.error("Cari kaydedilemedi:", err);
      alert("❌ Cari kaydedilirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const deleteCari = async (id) => {
    if (!confirm("Bu cariyi silmek istediğine emin misin?")) return;

    try {
      await fetch(`/api/cari?cariId=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      await fetchCariler();
      alert("🗑️ Cari silindi");
    } catch (err) {
      console.error("Cari silinemedi:", err);
      alert("❌ Cari silinirken hata oluştu");
    }
  };

  // 📤 Excel Export
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cariler);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cariler");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), "cariler.xlsx");
  };

  // 📥 Excel Import
  const importExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = XLSX.read(evt.target.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json(
        data.Sheets[data.SheetNames[0]] || {}
      );

      for (let row of json) {
        await fetch("/api/cari", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ ...emptyForm, ...row }),
        });
      }

      alert("✅ Excel'den cariler yüklendi");
      fetchCariler();
    };
    reader.readAsBinaryString(file);
  };

  // ☎ Telefonu normalize et (WhatsApp için)
  const normalizePhone = (tel) => {
    if (!tel) return "";
    const digits = String(tel).replace(/\D/g, "");
    return digits.replace(/^0/, "");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        💼 Cari Yönetimi
      </h1>

      {/* ✅ Tabs */}
      <div className="flex gap-2 mb-3">
        {["form", "liste", "excel"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded ${
              activeTab === t ? "bg-orange-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setActiveTab(t)}
          >
            {t === "form" && "➕ Yeni / Düzenle"}
            {t === "liste" && "📋 Cari Listesi"}
            {t === "excel" && "📂 Excel İşlemleri"}
          </button>
        ))}
      </div>

      {/* ✅ FORM */}
      {activeTab === "form" && (
        <form
          onSubmit={saveCari}
          className="bg-white p-6 rounded-xl shadow grid grid-cols-12 gap-4"
        >
          <input
            className="input col-span-6"
            placeholder="Ad *"
            value={form.ad}
            onChange={(e) => setForm({ ...form, ad: e.target.value })}
            required
          />

          <select
            className="input col-span-3"
            value={form.tur}
            onChange={(e) => setForm({ ...form, tur: e.target.value })}
          >
            <option>Müşteri</option>
            <option>Tedarikçi</option>
          </select>

          <input
            className="input col-span-3"
            placeholder="Telefon"
            value={form.telefon}
            onChange={(e) => setForm({ ...form, telefon: e.target.value })}
          />

          <input
            className="input col-span-6"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <select
            className="input col-span-2"
            value={form.vergiTipi}
            onChange={(e) => setForm({ ...form, vergiTipi: e.target.value })}
          >
            <option>TCKN</option>
            <option>VKN</option>
          </select>

          <input
            className="input col-span-4"
            placeholder="Vergi No"
            value={form.vergiNo}
            onChange={(e) => setForm({ ...form, vergiNo: e.target.value })}
          />

          <input
            className="input col-span-6"
            placeholder="Vergi Dairesi"
            value={form.vergiDairesi}
            onChange={(e) =>
              setForm({ ...form, vergiDairesi: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="İl"
            value={form.il}
            onChange={(e) => setForm({ ...form, il: e.target.value })}
          />

          <input
            className="input col-span-4"
            placeholder="İlçe"
            value={form.ilce}
            onChange={(e) => setForm({ ...form, ilce: e.target.value })}
          />

          <input
            className="input col-span-4"
            placeholder="Posta Kodu"
            value={form.postaKodu}
            onChange={(e) =>
              setForm({ ...form, postaKodu: e.target.value })
            }
          />

          <textarea
            className="input col-span-12"
            placeholder="Adres"
            value={form.adres}
            onChange={(e) => setForm({ ...form, adres: e.target.value })}
          />

          {/* 🛒 Pazaryeri ID'leri başlık */}
          <div className="col-span-12 text-sm font-semibold text-slate-600 mt-2">
            Pazaryeri Müşteri ID&apos;leri
          </div>

          <input
            className="input col-span-4"
            placeholder="🛒 Trendyol Müşteri ID"
            value={form.trendyolCustomerId}
            onChange={(e) =>
              setForm({ ...form, trendyolCustomerId: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="🏬 Hepsiburada Müşteri ID"
            value={form.hbCustomerId}
            onChange={(e) =>
              setForm({ ...form, hbCustomerId: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="🧺 N11 Müşteri ID"
            value={form.n11CustomerId}
            onChange={(e) =>
              setForm({ ...form, n11CustomerId: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="📦 Amazon Müşteri ID"
            value={form.amazonCustomerId}
            onChange={(e) =>
              setForm({ ...form, amazonCustomerId: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="📮 PTT AVM Müşteri ID"
            value={form.pttCustomerId}
            onChange={(e) =>
              setForm({ ...form, pttCustomerId: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="📚 İdefix / D&R Müşteri ID"
            value={form.idefixCustomerId}
            onChange={(e) =>
              setForm({ ...form, idefixCustomerId: e.target.value })
            }
          />

          <input
            className="input col-span-4"
            placeholder="🌸 ÇiçekSepeti Müşteri ID"
            value={form.ciceksepetiCustomerId}
            onChange={(e) =>
              setForm({ ...form, ciceksepetiCustomerId: e.target.value })
            }
          />

          <div className="col-span-12 flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                className="btn-gray"
                onClick={resetForm}
              >
                İptal
              </button>
            )}
            <button className="btn-primary" disabled={loading}>
              {loading
                ? "Kaydediliyor..."
                : editingId
                ? "Güncelle"
                : "Kaydet"}
            </button>
          </div>
        </form>
      )}

      {/* ✅ LİSTE */}
      {activeTab === "liste" && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Ad</th>
                <th className="px-2 py-1">Tür</th>
                <th className="px-2 py-1">Telefon</th>
                <th className="px-2 py-1">Vergi</th>
                <th className="px-2 py-1">Trendyol</th>
                <th className="px-2 py-1">HB</th>
                <th className="px-2 py-1">N11</th>
                <th className="px-2 py-1">Amazon</th>
                <th className="px-2 py-1">PTT</th>
                <th className="px-2 py-1">İdefix</th>
                <th className="px-2 py-1">ÇiçekSepeti</th>
                <th className="px-2 py-1">Cari Alacak</th>
                <th className="px-2 py-1">Cari Borç</th>
                <th className="px-2 py-1">Bakiye</th>
                <th className="px-2 py-1">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {cariler.map((c, i) => {
                const wa = normalizePhone(c.telefon);
                return (
                  <tr
                    key={c._id}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{c.ad}</td>
                    <td className="px-2 py-1">{c.tur}</td>
                    <td className="px-2 py-1">
                      {c.telefon}{" "}
                      {wa && (
                        <a
                          href={`https://wa.me/90${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-600"
                        >
                          WhatsApp
                        </a>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {c.vergiTipi}:{c.vergiNo}
                      {c.vergiDairesi ? ` (${c.vergiDairesi})` : ""}
                    </td>
                    <td className="px-2 py-1">
                      {c.trendyolCustomerId || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {c.hbCustomerId || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {c.n11CustomerId || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {c.amazonCustomerId || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {c.pttCustomerId || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {c.idefixCustomerId || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {c.ciceksepetiCustomerId || "-"}
                    </td>
                    <td className="px-2 py-1 text-green-600">
                      ₺{(c.cariAlacak || 0).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-2 py-1 text-red-600">
                      ₺{(c.cariBorc || 0).toLocaleString("tr-TR")}
                    </td>
                    <td
                      className={`px-2 py-1 font-bold ${
                        (c.bakiye || 0) > 0
                          ? "text-green-600"
                          : (c.bakiye || 0) < 0
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      ₺{(c.bakiye || 0).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600"
                          onClick={() => {
                            setForm({
                              ...emptyForm,
                              ...c,
                            });
                            setEditingId(c._id);
                            setActiveTab("form");
                          }}
                        >
                          ✏️
                        </button>

                        <Link
                          href={`/dashboard/cari-ekstre?cariId=${c._id}`}
                          className="text-orange-600"
                        >
                          📄
                        </Link>

                        <button
                          className="text-red-600"
                          onClick={() => deleteCari(c._id)}
                        >
                          🗑️
                        </button>

                        <button
                          className="text-purple-600"
                          onClick={() => setDetail(c)}
                        >
                          ℹ️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Excel */}
      {activeTab === "excel" && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4 text-center">
          <button onClick={exportExcel} className="btn-primary">
            📤 Excel Dışa Aktar
          </button>
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            onChange={importExcel}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-gray"
          >
            📥 Excel İçeri Al
          </button>
        </div>
      )}

      {/* ✅ Cari Detay Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[420px] shadow-xl space-y-3 border border-slate-200">
            {/* Başlık */}
            <h2 className="font-bold text-xl text-orange-600 text-center">
              👤 {detail.ad}
            </h2>

            {/* Temel bilgiler */}
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                <strong>Tür:</strong> {detail.tur}
              </p>

              <p>
                <strong>Telefon:</strong> {detail.telefon || "-"}{" "}
                {normalizePhone(detail.telefon) && (
                  <a
                    href={`https://wa.me/90${normalizePhone(
                      detail.telefon
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-600 font-semibold ml-1"
                  >
                    WhatsApp
                  </a>
                )}
              </p>

              <p>
                <strong>Email:</strong> {detail.email || "-"}
              </p>

              <p>
                <strong>Vergi:</strong> {detail.vergiTipi}:{detail.vergiNo}{" "}
                {detail.vergiDairesi && (
                  <span className="text-slate-500">
                    ({detail.vergiDairesi})
                  </span>
                )}
              </p>

              <p>
                <strong>Adres:</strong> {detail.adres || "-"}
              </p>
            </div>

            {/* Pazaryeri ID’leri */}
            <div className="mt-3 border-t pt-3 text-sm text-slate-700 space-y-1">
              <h3 className="font-semibold text-slate-800">
                🛒 Pazaryeri ID’leri
              </h3>

              <p>Trendyol: {detail.trendyolCustomerId || "-"}</p>
              <p>Hepsiburada: {detail.hbCustomerId || "-"}</p>
              <p>N11: {detail.n11CustomerId || "-"}</p>
              <p>Amazon: {detail.amazonCustomerId || "-"}</p>
              <p>PTT AVM: {detail.pttCustomerId || "-"}</p>
              <p>İdefix / D&R: {detail.idefixCustomerId || "-"}</p>
              <p>
                ÇiçekSepeti: {detail.ciceksepetiCustomerId || "-"}
              </p>
            </div>

            {/* Cari Alacak, Borç, Bakiye */}
            <div className="mt-3 border-t pt-3 space-y-1 text-sm">
              <p>
                <strong>Cari Alacak:</strong>{" "}
                <span className="text-green-600 font-semibold">
                  ₺{(detail.cariAlacak || 0).toLocaleString("tr-TR")}
                </span>
              </p>
              <p>
                <strong>Cari Borç:</strong>{" "}
                <span className="text-red-600 font-semibold">
                  ₺{(detail.cariBorc || 0).toLocaleString("tr-TR")}
                </span>
              </p>
              <p>
                <strong>Bakiye:</strong>{" "}
                <span
                  className={`font-bold ${
                    (detail.bakiye || 0) > 0
                      ? "text-green-600"
                      : (detail.bakiye || 0) < 0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  ₺{(detail.bakiye || 0).toLocaleString("tr-TR")}
                </span>
              </p>
            </div>

            {/* Butonlar */}
            <div className="flex gap-3 mt-4">
              <Link
                href={`/dashboard/cari-ekstre?cariId=${detail._id}`}
                className="btn-primary w-full text-center"
              >
                📄 Ekstre Görüntüle
              </Link>
              <button
                className="btn-gray w-full"
                onClick={() => setDetail(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
