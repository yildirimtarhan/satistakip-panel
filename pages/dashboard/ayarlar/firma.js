"use client";
import { useEffect, useState } from "react";

export default function FirmaAyarları() {
  const [form, setForm] = useState({
    firmaAdi: "",
    yetkili: "",
    telefon: "",
    eposta: "",
    web: "",
    vergiDairesi: "",
    vergiNo: "",
    adres: "",
    logo: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Logo yükleme
  const pickLogo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setForm({ ...form, logo: r.result });
    r.readAsDataURL(f);
  };

  // ✅ Firma bilgilerini token ile çek
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");

        const r = await fetch("/api/settings/company", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (r.ok) {
          const d = await r.json();
          setForm(d);
        }
      } catch (err) {
        console.error("Firma ayarları yüklenemedi:", err);
      }
    })();
  }, []);

  // ✅ Firma bilgilerini token ile kaydet
  const save = async () => {
    try {
      const token = localStorage.getItem("token");

      const r = await fetch("/api/settings/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const d = await r.json();
      alert(d.message || "Kaydedildi");
    } catch (err) {
      console.error("Firma ayarları kaydedilemedi:", err);
      alert("Hata oluştu!");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-orange-600">🏢 Firma Ayarları</h1>

      <div className="bg-white p-4 rounded-xl shadow grid grid-cols-2 gap-3">
        <div>
          <label>Firma Adı</label>
          <input
            name="firmaAdi"
            value={form.firmaAdi}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label>Yetkili Kişi</label>
          <input
            name="yetkili"
            value={form.yetkili}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label>Telefon</label>
          <input
            name="telefon"
            value={form.telefon}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label>E-posta</label>
          <input
            name="eposta"
            value={form.eposta}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label>Web Sitesi</label>
          <input
            name="web"
            value={form.web}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label>Vergi Dairesi</label>
          <input
            name="vergiDairesi"
            value={form.vergiDairesi}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label>Vergi No</label>
          <input
            name="vergiNo"
            value={form.vergiNo}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="col-span-2">
          <label>Adres</label>
          <textarea
            name="adres"
            value={form.adres}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="col-span-2">
          <label>Logo</label>
          <br />
          <input type="file" onChange={pickLogo} />
          {form.logo && (
            <img
              src={form.logo}
              alt="logo"
              className="h-16 mt-2 border rounded"
            />
          )}
        </div>
      </div>

      <button
        onClick={save}
        className="bg-orange-600 text-white px-4 py-2 rounded"
      >
        💾 Kaydet
      </button>
    </div>
  );
}
