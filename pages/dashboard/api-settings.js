// 📁 /pages/dashboard/api-settings.js
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export default function ApiSettings() {
  const [activeTab, setActiveTab] = useState("hepsiburada");

  const [form, setForm] = useState({
    hbMerchantId: "",
    hbSecretKey: "",
    hbUserAgent: "",

    trendyolSupplierId: "",
    trendyolApiKey: "",
    trendyolApiSecret: "",

    n11AppKey: "",
    n11AppSecret: "",
    n11Environment: "production",
  });

  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);
  }, []);

  // 🔹 Mevcut ayarları yükle
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/get", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();

        if (data?.settings) {
          setForm((prev) => ({ ...prev, ...data.settings }));
        }
      } catch (error) {
        console.log("Ayarlar alınamadı:", error);
      }
    }

    if (token) loadSettings();
  }, [token]);

  // 🔹 Kaydetme fonksiyonu
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
          <h2 className="text-lg font-semibold mb-3">
            🛍️ Hepsiburada API Ayarları
          </h2>

          <label>Merchant ID</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.hbMerchantId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, hbMerchantId: e.target.value }))
            }
          />

          <label>Secret Key</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.hbSecretKey}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, hbSecretKey: e.target.value }))
            }
          />

          <label>User Agent</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.hbUserAgent}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, hbUserAgent: e.target.value }))
            }
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
            onChange={(e) =>
              setForm((prev) => ({ ...prev, n11AppKey: e.target.value }))
            }
          />

          <label>App Secret</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.n11AppSecret}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, n11AppSecret: e.target.value }))
            }
          />

          <label>Environment (production / sandbox)</label>
          <input
            className="border p-2 w-full mb-2"
            value={form.n11Environment}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, n11Environment: e.target.value }))
            }
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
