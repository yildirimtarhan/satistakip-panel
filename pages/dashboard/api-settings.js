// 📁 /pages/dashboard/api-settings.js
import { useState, useEffect } from "react";

export default function ApiSettings() {
  const [activeTab, setActiveTab] = useState("hepsiburada");

  const [form, setForm] = useState({
    hbMerchantId: "",
    hbSecretKey: "",
    hbUserAgent: "",
    n11AppKey: "",
    n11AppSecret: "",
    n11Environment: "production",
  });

  const [message, setMessage] = useState("");

  // 🔹 Mevcut ayarları yükle
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/get");
        const data = await res.json();
        if (data.settings) setForm({ ...form, ...data.settings });
      } catch (error) {
        console.log("Ayarlar alınamadı:", error);
      }
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Kaydetme fonksiyonu
  const saveSettings = async () => {
    const res = await fetch("/api/settings/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">⚙️ API Ayarları</h1>

      {/* Sekme butonları */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <button
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === "hepsiburada"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setActiveTab("hepsiburada")}
        >
          Hepsiburada
        </button>

        <button
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === "n11"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setActiveTab("n11")}
        >
          N11
        </button>
      </div>

      {/* 🔹 Hepsiburada Sekmesi */}
      {activeTab === "hepsiburada" && (
        <div>
          <h2 className="text-lg font-semibold mb-3">🛍️ Hepsiburada API Ayarları</h2>
          <label>Merchant ID</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.hbMerchantId}
            onChange={(e) => setForm({ ...form, hbMerchantId: e.target.value })}
          />

          <label>Secret Key</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.hbSecretKey}
            onChange={(e) => setForm({ ...form, hbSecretKey: e.target.value })}
          />

          <label>User Agent</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.hbUserAgent}
            onChange={(e) => setForm({ ...form, hbUserAgent: e.target.value })}
          />
        </div>
      )}

      {/* 🔹 N11 Sekmesi */}
      {activeTab === "n11" && (
        <div>
          <h2 className="text-lg font-semibold mb-3">🧾 N11 API Ayarları</h2>
          <label>App Key</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.n11AppKey}
            onChange={(e) => setForm({ ...form, n11AppKey: e.target.value })}
          />

          <label>App Secret</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.n11AppSecret}
            onChange={(e) => setForm({ ...form, n11AppSecret: e.target.value })}
          />

          <label>Environment (örnek: production veya sandbox)</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.n11Environment}
            onChange={(e) => setForm({ ...form, n11Environment: e.target.value })}
          />
        </div>
      )}

      {/* Kaydet butonu */}
      <button
        onClick={saveSettings}
        className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
      >
        Kaydet
      </button>

      {message && <p className="mt-3 text-green-600 font-bold">{message}</p>}
    </div>
  );
}
