// 📁 /pages/dashboard/e-donusum/efatura-basvuru.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function EFaturaBasvuruWizard() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);

  const [form, setForm] = useState({
    modules: {
      efatura: true,
      earsiv: true,
      eirsaliye: false,
    },
    packageType: "standart",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    note: "",
    accept: false,
  });

  // Firma ayarlarını çek, iletişim bilgilerini doldur
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/settings/company", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();

        setCompany(data);
        setForm((prev) => ({
          ...prev,
          contactName: data.companyTitle || prev.contactName,
          contactPhone: data.phone || prev.contactPhone,
          contactEmail: data.email || prev.contactEmail,
        }));
      } catch (err) {
        console.error("Firma bilgisi alınamadı:", err);
      }
    };

    fetchCompany();
  }, []);

  const nextStep = () => setStep((s) => Math.min(3, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!form.accept) {
      alert("Devam etmek için sözleşmeyi onaylamalısınız.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/efatura/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modules: form.modules,
          packageType: form.packageType,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail,
          note: form.note,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        alert(data.message || "Başvuru kaydedilemedi");
        return;
      }

      alert("🎉 Başvurunuz alındı. Yönetici onayından sonra bilgilendirileceksiniz.");
      router.push("/dashboard/e-donusum/basvurularim");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Sunucu hatası oluştu.");
    }
  };

  // Basit step indicator
  const StepIndicator = () => (
    <div className="flex justify-center gap-4 mb-4 text-sm">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border 
          ${step === s ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600"}`}
        >
          <span className="w-5 h-5 flex items-center justify-center rounded-full border border-current text-xs">
            {s}
          </span>
          <span>
            {s === 1 && "Modül Seçimi"}
            {s === 2 && "Firma & İletişim"}
            {s === 3 && "Özet & Onay"}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        🧾 E-Fatura / E-Arşiv / E-İrsaliye Başvurusu
      </h1>

      <StepIndicator />

      {/* ADIM 1 – Modüller */}
      {step === 1 && (
        <div className="bg-white p-5 rounded-xl shadow grid md:grid-cols-3 gap-4">
          <div
            className={`border rounded-xl p-4 cursor-pointer ${
              form.modules.efatura ? "border-orange-500 bg-orange-50" : "border-slate-200"
            }`}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                modules: { ...prev.modules, efatura: !prev.modules.efatura },
              }))
            }
          >
            <h2 className="font-semibold text-lg">📄 E-Fatura</h2>
            <p className="text-sm text-slate-600 mt-1">
              Temel e-Fatura altyapısı. Cari ve satış modülleriyle entegre çalışır.
            </p>
            <div className="mt-3">
              <input
                type="checkbox"
                checked={form.modules.efatura}
                readOnly
              />{" "}
              <span className="text-sm">Seçili</span>
            </div>
          </div>

          <div
            className={`border rounded-xl p-4 cursor-pointer ${
              form.modules.earsiv ? "border-orange-500 bg-orange-50" : "border-slate-200"
            }`}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                modules: { ...prev.modules, earsiv: !prev.modules.earsiv },
              }))
            }
          >
            <h2 className="font-semibold text-lg">🧾 E-Arşiv</h2>
            <p className="text-sm text-slate-600 mt-1">
              Tüm son kullanıcılara e-Arşiv fatura kesimi. Online satışlarda zorunlu.
            </p>
            <div className="mt-3">
              <input
                type="checkbox"
                checked={form.modules.earsiv}
                readOnly
              />{" "}
              <span className="text-sm">Seçili</span>
            </div>
          </div>

          <div
            className={`border rounded-xl p-4 cursor-pointer ${
              form.modules.eirsaliye ? "border-orange-500 bg-orange-50" : "border-slate-200"
            }`}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                modules: { ...prev.modules, eirsaliye: !prev.modules.eirsaliye },
              }))
            }
          >
            <h2 className="font-semibold text-lg">🚚 E-İrsaliye</h2>
            <p className="text-sm text-slate-600 mt-1">
              Sevkiyatlarınız için dijital irsaliye düzenleme ve saklama.
            </p>
            <div className="mt-3">
              <input
                type="checkbox"
                checked={form.modules.eirsaliye}
                readOnly
              />{" "}
              <span className="text-sm">Seçili</span>
            </div>
          </div>
        </div>
      )}

      {/* ADIM 2 – Firma & İletişim */}
      {step === 2 && (
        <div className="bg-white p-5 rounded-xl shadow space-y-4">
          <h2 className="font-semibold text-lg">🏢 Firma & İletişim Bilgileri</h2>

          {company && (
            <div className="border rounded-lg p-3 text-sm bg-orange-50">
              <div><b>Firma:</b> {company.companyTitle || "-"}</div>
              <div><b>VKN/TCKN:</b> {company.vknTckn || "-"}</div>
              <div><b>Vergi Dairesi:</b> {company.taxOffice || "-"}</div>
              <div><b>Adres:</b> {company.address || "-"}</div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="font-semibold">İlgili Kişi Ad Soyad</label>
              <input
                className="input mt-1"
                value={form.contactName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="font-semibold">Telefon</label>
              <input
                className="input mt-1"
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="font-semibold">E-posta</label>
              <input
                className="input mt-1"
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="font-semibold text-sm">Not / Açıklama</label>
            <textarea
              className="input w-full mt-1"
              rows={3}
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="Örn: Halihazırda başka entegratör kullanıyorum, geçiş yapmak istiyorum..."
            />
          </div>
        </div>
      )}

      {/* ADIM 3 – Özet & Onay */}
      {step === 3 && (
        <div className="bg-white p-5 rounded-xl shadow space-y-4 text-sm">
          <h2 className="font-semibold text-lg">📑 Özet & Sözleşme Onayı</h2>

          <div className="border rounded-lg p-3">
            <p className="font-semibold mb-1">Seçilen Modüller:</p>
            <ul className="list-disc ml-5">
              {form.modules.efatura && <li>E-Fatura</li>}
              {form.modules.earsiv && <li>E-Arşiv</li>}
              {form.modules.eirsaliye && <li>E-İrsaliye</li>}
            </ul>
          </div>

          <div className="border rounded-lg p-3 max-h-40 overflow-auto text-xs bg-slate-50">
            <p className="font-semibold mb-1">E-Dönüşüm Hizmet Sözleşmesi (Özet)</p>
            <p>
              • Bu başvuru SatışTakip ERP üzerinden e-Fatura / e-Arşiv / e-İrsaliye kullanımı
              içindir.
            </p>
            <p>
              • Başvurunuz onaylandığında, entegratör (Taxten vb.) üzerinde hesabınız
              oluşturulacak ve paneliniz aktive edilecektir.
            </p>
            <p>
              • Mevzuat gereği zorunlu tüm sorumluluklar kullanıcıya aittir. Sistem sadece
              teknik arayüz ve kayıt saklama hizmeti sunar.
            </p>
            <p>• Detaylı sözleşme metni ilerleyen aşamada sistemde gösterilecektir.</p>
          </div>

          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={form.accept}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, accept: e.target.checked }))
              }
            />
            <span>
              Yukarıdaki bilgilerin doğru olduğunu ve e-Dönüşüm sözleşmesini onayladığımı
              beyan ediyorum.
            </span>
          </label>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex justify-between">
        <button
          className="btn-gray"
          onClick={prevStep}
          disabled={step === 1}
        >
          ⬅ Geri
        </button>

        <div className="flex gap-2">
          {step < 3 && (
            <button className="btn-primary" onClick={nextStep}>
              İleri ➜
            </button>
          )}

          {step === 3 && (
            <button
              className="btn-primary bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Gönderiliyor..." : "📤 Başvuruyu Gönder"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
