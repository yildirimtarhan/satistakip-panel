import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export default function ApiSettings() {
  const router = useRouter();
  const tabFromUrl = router.query?.tab;
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "trendyol" ? "trendyol" : tabFromUrl === "n11" ? "n11" : tabFromUrl === "pazarama" ? "pazarama" : "hepsiburada"
  );

  useEffect(() => {
    if (["trendyol", "n11", "pazarama"].includes(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const [form, setForm] = useState({
    hbMerchantId: "",
    hbUsername: "",
    hbPassword: "",
    hbTestMode: false,
    hbStoreName: "",

    trendyolSupplierId: "",
    trendyolApiKey: "",
    trendyolApiSecret: "",
    trendyolStoreName: "",

    n11AppKey: "",
    n11AppSecret: "",
    n11Environment: "production",
    n11StoreName: "",

    pazaramaSellerId: "",
    pazaramaApiKey: "",
    pazaramaApiSecret: "",
    pazaramaStoreName: "",
  });

  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingTrendyol, setTestingTrendyol] = useState(false);
  const [testResultTrendyol, setTestResultTrendyol] = useState(null);
  const [testingPazarama, setTestingPazarama] = useState(false);
  const [testResultPazarama, setTestResultPazarama] = useState(null);

  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/get", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data?.settings) setForm((prev) => ({ ...prev, ...data.settings }));
      } catch {}
    }
    if (token) loadSettings();
  }, [token]);

  const saveSettings = async () => {
    setMessage("");
    const res = await fetch("/api/settings/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(data.message || "Kaydedildi");
  };

  const testHBConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/hepsiburada/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    }
    setTesting(false);
  };

  const testTrendyolConnection = async () => {
    setTestingTrendyol(true);
    setTestResultTrendyol(null);
    try {
      const res = await fetch("/api/trendyol/test-connection", {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setTestResultTrendyol({ success: data.success, message: data.message || data.error });
    } catch (e) {
      setTestResultTrendyol({ success: false, message: e.message });
    }
    setTestingTrendyol(false);
  };

  const testPazaramaConnection = async () => {
    setTestingPazarama(true);
    setTestResultPazarama(null);
    try {
      const res = await fetch("/api/pazarama/test-connection", {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setTestResultPazarama({ success: data.success, message: data.message || data.error });
    } catch (e) {
      setTestResultPazarama({ success: false, message: e.message });
    }
    setTestingPazarama(false);
  };

  const inp = "border border-gray-300 rounded-lg p-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const lbl = "block text-sm font-medium text-gray-700 mb-1 mt-3";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">API Ayarlari</h1>

      <div className="flex gap-2 mb-6 border-b pb-2">
        {[
          { id: "hepsiburada", label: "Hepsiburada" },
          { id: "n11", label: "N11" },
          { id: "trendyol", label: "Trendyol" },
          { id: "pazarama", label: "Pazarama" },
        ].map((tab) => (
          <button key={tab.id}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${activeTab === tab.id ? "bg-orange-500 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "hepsiburada" && (
        <div>
          <h2 className="text-lg font-semibold mb-1 text-gray-800">Hepsiburada API Ayarlari</h2>
          <p className="text-xs text-gray-500 mb-4">Hepsiburada Magaza Paneli &gt; API Entegrasyon bilgilerini girin.</p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Test Modu (SIT Ortami)</p>
              <p className="text-xs text-yellow-600">Aktifken sit.mpop.hepsiburada.com kullanilir</p>
            </div>
            <button onClick={() => setForm((p) => ({ ...p, hbTestMode: !p.hbTestMode }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.hbTestMode ? "bg-yellow-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.hbTestMode ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <label className={lbl}>Merchant ID</label>
          <input className={inp} placeholder="Ornek: 12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.hbMerchantId}
            onChange={(e) => setForm((p) => ({ ...p, hbMerchantId: e.target.value }))} />

          <label className={lbl}>Kullanici Adi (E-posta)</label>
          <input className={inp} placeholder="magaza@email.com" value={form.hbUsername}
            onChange={(e) => setForm((p) => ({ ...p, hbUsername: e.target.value }))} />

          <label className={lbl}>Sifre</label>
          <input className={inp} type="password" placeholder="Sifreniz" value={form.hbPassword}
            onChange={(e) => setForm((p) => ({ ...p, hbPassword: e.target.value }))} />

          <label className={lbl}>Satici / Magaza adi</label>
          <input className={inp} placeholder="Kargo ciktilarinda gorunecek magaza adi" value={form.hbStoreName}
            onChange={(e) => setForm((p) => ({ ...p, hbStoreName: e.target.value }))} />

          <button onClick={testHBConnection} disabled={testing}
            className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50">
            {testing ? "Test ediliyor..." : "Baglanti Test Et"}
          </button>

          {testResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {testResult.success ? "Baglanti basarili! Token alindi." : `Hata: ${testResult.message}`}
              {testResult.detail && <pre className="text-xs mt-1 overflow-auto">{JSON.stringify(testResult.detail, null, 2)}</pre>}
            </div>
          )}
        </div>
      )}

      {activeTab === "n11" && (
        <div>
          <h2 className="text-lg font-semibold mb-1 text-gray-800">N11 API Ayarlari</h2>
          <p className="text-xs text-gray-500 mb-4">N11 Magaza Paneli &gt; API Erisim bilgilerini girin.</p>
          <label className={lbl}>App Key</label>
          <input className={inp} value={form.n11AppKey} onChange={(e) => setForm((p) => ({ ...p, n11AppKey: e.target.value }))} />
          <label className={lbl}>App Secret</label>
          <input className={inp} type="password" value={form.n11AppSecret} onChange={(e) => setForm((p) => ({ ...p, n11AppSecret: e.target.value }))} />
          <label className={lbl}>Ortam</label>
          <select className={inp} value={form.n11Environment} onChange={(e) => setForm((p) => ({ ...p, n11Environment: e.target.value }))}>
            <option value="production">Production (Canli)</option>
            <option value="sandbox">Sandbox (Test)</option>
          </select>
          <label className={lbl}>Satici / Magaza adi</label>
          <input className={inp} placeholder="Kargo ciktilarinda gorunecek magaza adi" value={form.n11StoreName}
            onChange={(e) => setForm((p) => ({ ...p, n11StoreName: e.target.value }))} />
        </div>
      )}

      {activeTab === "trendyol" && (
        <div>
          <h2 className="text-lg font-semibold mb-1 text-gray-800">Trendyol API Ayarlari</h2>
          <p className="text-xs text-gray-500 mb-2">Trendyol Satici Paneli &gt; Hesap Bilgilerim &gt; API bilgilerini girin.</p>
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <strong>401 alıyorsanız:</strong> Supplier ID, API Key ve API Secret <strong>aynı hesaba ait</strong> olmalı (Hesap Bilgilerim&apos;deki değerleri olduğu gibi kopyalayın, başında/sonunda boşluk bırakmayın). Test için <a href="https://stagepartner.trendyol.com/account/login" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">Stage panel</a>, canlı için canlı panel bilgilerini kullanın.
          </div>
          <label className={lbl}>Supplier ID</label>
          <input className={inp} value={form.trendyolSupplierId} onChange={(e) => setForm((p) => ({ ...p, trendyolSupplierId: e.target.value }))} placeholder="örn. 2738 (test)" />
          <label className={lbl}>API Key</label>
          <input className={inp} value={form.trendyolApiKey} onChange={(e) => setForm((p) => ({ ...p, trendyolApiKey: e.target.value }))} placeholder="Hesap Bilgilerim'den" />
          <label className={lbl}>API Secret</label>
          <input className={inp} type="password" value={form.trendyolApiSecret} onChange={(e) => setForm((p) => ({ ...p, trendyolApiSecret: e.target.value }))} placeholder="Hesap Bilgilerim'den" />
          <label className={lbl}>Satici / Magaza adi</label>
          <input className={inp} placeholder="Kargo ciktilarinda gorunecek magaza adi" value={form.trendyolStoreName}
            onChange={(e) => setForm((p) => ({ ...p, trendyolStoreName: e.target.value }))} />
          <button
            type="button"
            onClick={testTrendyolConnection}
            disabled={testingTrendyol || !form.trendyolSupplierId || !form.trendyolApiKey || !form.trendyolApiSecret}
            className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingTrendyol ? "Test ediliyor..." : "Baglanti Test Et"}
          </button>

          {testResultTrendyol && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${testResultTrendyol.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {testResultTrendyol.success ? "✅ " : "❌ "}{testResultTrendyol.message}
            </div>
          )}
        </div>
      )}

      {activeTab === "pazarama" && (
        <div>
          <h2 className="text-lg font-semibold mb-1 text-gray-800">Pazarama API Ayarları</h2>
          <p className="text-xs text-gray-500 mb-4">
            İş Ortağım Paneli → Hesabım &gt; Hesap Bilgileri &gt; Entegrasyon Bilgileri&apos;nden API Key ve API Secret alın.
          </p>
          <label className={lbl}>Satıcı ID (Opsiyonel)</label>
          <input className={inp} value={form.pazaramaSellerId} onChange={(e) => setForm((p) => ({ ...p, pazaramaSellerId: e.target.value }))}
            placeholder="95fe61cf-111b-48ac-8896-08de7b94dfe0" />
          <label className={lbl}>API Key</label>
          <input className={inp} value={form.pazaramaApiKey} onChange={(e) => setForm((p) => ({ ...p, pazaramaApiKey: e.target.value }))}
            placeholder="Entegrasyon Bilgileri'nden" />
          <label className={lbl}>API Secret</label>
          <input className={inp} type="password" value={form.pazaramaApiSecret} onChange={(e) => setForm((p) => ({ ...p, pazaramaApiSecret: e.target.value }))}
            placeholder="Entegrasyon Bilgileri'nden" />
          <label className={lbl}>Satıcı / Mağaza adı</label>
          <input className={inp} placeholder="Kargo çıktılarında görünecek mağaza adı" value={form.pazaramaStoreName}
            onChange={(e) => setForm((p) => ({ ...p, pazaramaStoreName: e.target.value }))} />
          <button
            type="button"
            onClick={testPazaramaConnection}
            disabled={testingPazarama || !form.pazaramaApiKey || !form.pazaramaApiSecret}
            className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingPazarama ? "Test ediliyor..." : "Bağlantı Test Et"}
          </button>
          {testResultPazarama && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${testResultPazarama.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {testResultPazarama.success ? "✅ " : "❌ "}{testResultPazarama.message}
            </div>
          )}
        </div>
      )}

      <button onClick={saveSettings}
        className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow">
        Kaydet
      </button>
      {message && <p className="mt-3 text-green-600 font-medium text-sm">{message}</p>}
    </div>
  );
}
