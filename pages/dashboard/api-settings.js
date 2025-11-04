// pages/dashboard/api-settings.js
import { useState, useEffect } from "react";

export default function ApiSettings() {
  const [form, setForm] = useState({
    hbMerchantId: "",
    hbSecretKey: "",
    hbUserAgent: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/get");
        const data = await res.json();
        if (data.settings) setForm(data.settings);
      } catch (error) {
        console.log("Ayarlar alınamadı");
      }
    }
    loadSettings();
  }, []);

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
    <div style={{ padding: "2rem", maxWidth: "400px" }}>
      <h1 className="text-xl font-bold mb-4">⚙️ Hepsiburada API Ayarları</h1>

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

      <button
        onClick={saveSettings}
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
      >
        Kaydet
      </button>

      {message && (
        <p className="mt-3 text-green-600 font-bold">{message}</p>
      )}
    </div>
  );
}
