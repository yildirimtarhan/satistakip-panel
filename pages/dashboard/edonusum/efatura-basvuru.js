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
    // Firma bilgileri (başvuru ekranında düzenlenebilir)
    firmaAdi: "",
    vergiNo: "",
    vergiDairesi: "",
    adres: "",
    telefon: "",
    eposta: "",
    web: "",
    yetkili: "",
    // İletişim (özet için aynı kalır)
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    logo: "",       // base64 data URL
    signature: "",  // base64 data URL (imza görseli)
    note: "",
    accept: false,
  });

  // Firma ayarlarını çek, formu doldur
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
          firmaAdi: data.firmaAdi || data.companyTitle || prev.firmaAdi,
          vergiNo: data.vergiNo || data.vknTckn || prev.vergiNo,
          vergiDairesi: data.vergiDairesi || data.taxOffice || prev.vergiDairesi,
          adres: data.adres || data.address || prev.adres,
          telefon: data.telefon || data.phone || prev.telefon,
          eposta: data.eposta || data.email || prev.eposta,
          web: data.web || data.website || prev.web,
          yetkili: data.yetkili || prev.yetkili,
          contactName: data.yetkili || data.companyTitle || data.firmaAdi || prev.contactName,
          contactPhone: data.telefon || data.phone || prev.contactPhone,
          contactEmail: data.eposta || data.email || prev.contactEmail,
          logo: data.logo || prev.logo,
          signature: data.imza || prev.signature,
        }));
      } catch (err) {
        console.error("Firma bilgisi alınamadı:", err);
      }
    };

    fetchCompany();
  }, []);

  const totalSteps = 4;
  const nextStep = () => setStep((s) => Math.min(totalSteps, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleFile = (field, e) => {
    const file = e?.target?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.accept) {
      alert("Devam etmek için sözleşmeyi onaylamalısınız.");
      return;
    }
    if (!form.firmaAdi?.trim() || !form.vergiNo?.trim()) {
      alert("Firma adı ve VKN/TCKN zorunludur.");
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
          contactName: form.contactName || form.yetkili,
          contactPhone: form.contactPhone || form.telefon,
          contactEmail: form.contactEmail || form.eposta,
          note: form.note,
          companyTitle: form.firmaAdi,
          vknTckn: form.vergiNo,
          taxOffice: form.vergiDairesi,
          address: form.adres,
          phone: form.telefon,
          email: form.eposta,
          website: form.web,
          logo: form.logo || undefined,
          signature: form.signature || undefined,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        alert(data.message || "Başvuru kaydedilemedi");
        return;
      }

      alert("🎉 Başvurunuz alındı. Yönetici onayından sonra bilgilendirileceksiniz.");
      router.push("/dashboard/edonusum/basvurularim");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Sunucu hatası oluştu.");
    }
  };

  const stepLabels = {
    1: "Modül Seçimi",
    2: "Firma Bilgileri",
    3: "Logo & İmza",
    4: "Özet & Onay",
  };
  const StepIndicator = () => (
    <div className="flex flex-wrap justify-center gap-2 mb-4 text-sm">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border 
          ${step === s ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600"}`}
        >
          <span className="w-5 h-5 flex items-center justify-center rounded-full border border-current text-xs">
            {s}
          </span>
          <span>{stepLabels[s]}</span>
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

      {/* ADIM 2 – Firma bilgileri (düzenlenebilir) */}
      {step === 2 && (
        <div className="bg-white p-5 rounded-xl shadow space-y-4">
          <h2 className="font-semibold text-lg">🏢 Firma Bilgileri</h2>
          <p className="text-sm text-slate-600">
            Bu bilgiler başvurunuz ve e-Fatura entegratörü (Taxten) tarafında kullanılacaktır. Firma ayarlarınızdan otomatik dolduruldu; gerekirse düzenleyin.
          </p>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="md:col-span-2">
              <label className="font-semibold">Firma Ünvanı / Adı *</label>
              <input
                className="input mt-1 w-full"
                value={form.firmaAdi}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firmaAdi: e.target.value }))
                }
                placeholder="Örn: ABC Ticaret Ltd. Şti."
              />
            </div>
            <div>
              <label className="font-semibold">VKN / TCKN *</label>
              <input
                className="input mt-1 w-full"
                value={form.vergiNo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vergiNo: e.target.value }))
                }
                placeholder="10 veya 11 hane"
                maxLength={11}
              />
            </div>
            <div>
              <label className="font-semibold">Vergi Dairesi</label>
              <input
                className="input mt-1 w-full"
                value={form.vergiDairesi}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vergiDairesi: e.target.value }))
                }
                placeholder="Örn: Kadıköy"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold">Adres</label>
              <textarea
                className="input mt-1 w-full"
                rows={2}
                value={form.adres}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, adres: e.target.value }))
                }
                placeholder="Fatura adresi"
              />
            </div>
            <div>
              <label className="font-semibold">Yetkili Kişi</label>
              <input
                className="input mt-1 w-full"
                value={form.yetkili}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, yetkili: e.target.value }))
                }
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label className="font-semibold">Telefon</label>
              <input
                className="input mt-1 w-full"
                value={form.telefon}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, telefon: e.target.value }))
                }
                placeholder="0xxx xxx xx xx"
              />
            </div>
            <div>
              <label className="font-semibold">E-posta</label>
              <input
                className="input mt-1 w-full"
                type="email"
                value={form.eposta}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, eposta: e.target.value }))
                }
                placeholder="info@firma.com"
              />
            </div>
            <div>
              <label className="font-semibold">Web</label>
              <input
                className="input mt-1 w-full"
                type="url"
                value={form.web}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, web: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ADIM 3 – Logo & İmza görseli */}
      {step === 3 && (
        <div className="bg-white p-5 rounded-xl shadow space-y-4">
          <h2 className="font-semibold text-lg">🖼️ Logo & İmza Görseli</h2>
          <p className="text-sm text-slate-600">
            Faturalarda ve belgelerde kullanılacak logo ile imza görselini yükleyebilirsiniz (opsiyonel). Taxten tarafında da bu bilgiler kullanılabilir.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="font-semibold block mb-2">Firma logosu</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700"
                onChange={(e) => handleFile("logo", e)}
              />
              {form.logo && (
                <div className="mt-2 p-2 border rounded-lg bg-slate-50 inline-block">
                  <img src={form.logo} alt="Logo önizleme" className="max-h-24 max-w-full object-contain" />
                </div>
              )}
            </div>
            <div>
              <label className="font-semibold block mb-2">İmza görseli</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700"
                onChange={(e) => handleFile("signature", e)}
              />
              {form.signature && (
                <div className="mt-2 p-2 border rounded-lg bg-slate-50 inline-block">
                  <img src={form.signature} alt="İmza önizleme" className="max-h-24 max-w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Taxten entegrasyonu:</strong> Başvurunuz onaylandıktan sonra e-Fatura/E-Arşiv işlemleri Taxten üzerinden yürütülür. Taxten panelinden de logo ve imza ayarlarınızı güncelleyebilirsiniz; burada yüklediğiniz görseller başvuru kaydınıza eklenir.
          </div>
        </div>
      )}

      {/* ADIM 4 – Özet & Onay */}
      {step === 4 && (
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

          <div className="border rounded-lg p-3">
            <p className="font-semibold mb-1">Firma:</p>
            <p>{form.firmaAdi || "—"}</p>
            <p>VKN/TCKN: {form.vergiNo || "—"} · Vergi Dairesi: {form.vergiDairesi || "—"}</p>
            <p>İletişim: {form.telefon || "—"} · {form.eposta || "—"}</p>
            {(form.logo || form.signature) && (
              <p className="mt-1 text-slate-600">Logo ve imza görselleri eklendi.</p>
            )}
          </div>

          <div className="mt-3">
            <label className="font-semibold text-sm">Not / Açıklama</label>
            <textarea
              className="input w-full mt-1"
              rows={2}
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="Opsiyonel..."
            />
          </div>

          <div className="border rounded-lg p-3 max-h-40 overflow-auto text-xs bg-slate-50">
            <p className="font-semibold mb-1">E-Dönüşüm Hizmet Sözleşmesi (Özet)</p>
            <p>
              • Bu başvuru SatışTakip ERP üzerinden e-Fatura / e-Arşiv / e-İrsaliye kullanımı
              içindir.
            </p>
            <p>
              • Başvurunuz onaylandığında, entegratör (Taxten) üzerinde hesabınız
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
          {step < totalSteps && (
            <button className="btn-primary" onClick={nextStep}>
              İleri ➜
            </button>
          )}

          {step === totalSteps && (
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
