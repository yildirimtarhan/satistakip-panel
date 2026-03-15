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
    imza: "",
    taxtenTestMode: true,
    efaturaFaturaNoPrefix: "KT",
    efaturaKontorLimit: "",
    senderIdentifier: "",
    taxtenClientId: "",
    taxtenApiKey: "",
    taxtenUsername: "",
    taxtenPassword: "",
    iban: "",
    bankaAdi: "",
    hesapNo: "",
    krediKartiBilgisi: "",
    hizmetlerimiz: "",
  });

  const [taxtenTesting, setTaxtenTesting] = useState(false);
  const [taxtenTestResult, setTaxtenTestResult] = useState(null);

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

  const testTaxtenConnection = async () => {
    setTaxtenTesting(true);
    setTaxtenTestResult(null);
    try {
      const token = localStorage.getItem("token");
      const r = await fetch("/api/efatura/taxten/test-connection", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      setTaxtenTestResult(d);
      if (d.ok) alert("✅ " + (d.message || "Taxten bağlantısı başarılı"));
      else alert("❌ " + (d.message || "Bağlantı başarısız"));
    } catch (e) {
      setTaxtenTestResult({ ok: false, message: e.message });
      alert("❌ " + (e.message || "Test hatası"));
    } finally {
      setTaxtenTesting(false);
    }
  };

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

        <div className="col-span-2 mt-2 pt-2 border-t">
          <h3 className="font-medium text-slate-600 mb-2">Banka Hesap Bilgileri (E-Fatura altında gösterilir)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label>Banka Adı</label>
              <input name="bankaAdi" value={form.bankaAdi || ""} onChange={handleChange} className="border p-2 rounded w-full" placeholder="Örn: Ziraat Bankası" />
            </div>
            <div>
              <label>Hesap No</label>
              <input name="hesapNo" value={form.hesapNo || ""} onChange={handleChange} className="border p-2 rounded w-full" placeholder="Hesap numarası" />
            </div>
            <div>
              <label>IBAN</label>
              <input name="iban" value={form.iban || ""} onChange={handleChange} className="border p-2 rounded w-full" placeholder="TR00 0000 0000 0000 0000 0000 00" />
            </div>
          </div>
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

      <div className="bg-white p-4 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-slate-700">📄 Taxten E-Fatura</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fatura no öneki</label>
            <input
              name="efaturaFaturaNoPrefix"
              value={form.efaturaFaturaNoPrefix ?? "KT"}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="KT"
              maxLength={10}
            />
            {/*’*/}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Kontör limiti</label>
            <input
              type="number"
              min="0"
              name="efaturaKontorLimit"
              value={form.efaturaKontorLimit ?? ""}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="Boş = sınırsız"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.taxtenTestMode !== false}
                onChange={(e) => setForm({ ...form, taxtenTestMode: e.target.checked })}
              />
              <span>Test modu (işaretsiz = canlı)</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Client ID</label>
            <input
              name="taxtenClientId"
              value={form.taxtenClientId || ""}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="Client ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">API Key</label>
            <input
              type="password"
              name="taxtenApiKey"
              value={form.taxtenApiKey || ""}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Gönderici etiket (opsiyonel)</label>
            <input
              name="senderIdentifier"
              value={form.senderIdentifier || ""}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="urn:mail:defaultgb@taxten.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Kullanıcı adı (Client ID yoksa)</label>
            <input
              name="taxtenUsername"
              value={form.taxtenUsername || ""}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="Kullanıcı adı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Şifre (Client ID yoksa)</label>
            <input
              type="password"
              name="taxtenPassword"
              value={form.taxtenPassword || ""}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              placeholder="Şifre"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={testTaxtenConnection}
            disabled={taxtenTesting}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded disabled:opacity-70"
          >
            {taxtenTesting ? "Test ediliyor…" : "🔗 Bağlantıyı Test Et"}
          </button>
          <p className="text-sm text-slate-500">Kaydettikten sonra test edin. Test/Canlı ortamı seçiminize göre doğrular.</p>
        </div>

        <p className="text-sm text-slate-500">
          Kontör: Sadece admin panelinden eklenir. <a href="/dashboard/e-donusum/efatura-kontor" className="text-orange-600 underline">E-Fatura Kontör</a> sayfasından görüntüleyebilirsiniz.
        </p>
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
