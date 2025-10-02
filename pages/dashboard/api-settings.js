// pages/dashboard/api-settings.js
import { useState } from "react";

export default function ApiSettings() {
  const [form, setForm] = useState({
    hepsiburadaMerchantId: "",
    hepsiburadaSecretKey: "",
    hepsiburadaUserAgent: "",
    trendyolSupplierId: "",
    trendyolApiKey: "",
    trendyolApiSecret: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("/api/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage("API bilgileri başarıyla kaydedildi ✅");
    } catch (err) {
      setMessage("Hata: " + err.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>API Ayarları</h1>
      <form onSubmit={handleSubmit}>
        <h3>Hepsiburada</h3>
        <input
          type="text"
          name="hepsiburadaMerchantId"
          placeholder="Merchant ID"
          value={form.hepsiburadaMerchantId}
          onChange={handleChange}
        />
        <input
          type="text"
          name="hepsiburadaSecretKey"
          placeholder="Secret Key"
          value={form.hepsiburadaSecretKey}
          onChange={handleChange}
        />
        <input
          type="text"
          name="hepsiburadaUserAgent"
          placeholder="User-Agent"
          value={form.hepsiburadaUserAgent}
          onChange={handleChange}
        />

        <h3>Trendyol</h3>
        <input
          type="text"
          name="trendyolSupplierId"
          placeholder="Supplier ID"
          value={form.trendyolSupplierId}
          onChange={handleChange}
        />
        <input
          type="text"
          name="trendyolApiKey"
          placeholder="API Key"
          value={form.trendyolApiKey}
          onChange={handleChange}
        />
        <input
          type="text"
          name="trendyolApiSecret"
          placeholder="API Secret"
          value={form.trendyolApiSecret}
          onChange={handleChange}
        />

        <button type="submit">Kaydet</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
