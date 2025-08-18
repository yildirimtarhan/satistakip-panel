import { useState, useEffect } from "react";

export default function ApiSettingPage() {
  const [form, setForm] = useState({
    trendyolApiKey: "",
    trendyolApiSecret: "",
    trendyolSupplierId: "",
    hepsiMerchantId: "",
    hepsiSecretKey: "",
    hepsiUserAgent: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("/api/settings/get", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok && data.settings) {
          setForm({
            trendyolApiKey: data.settings.trendyolApiKey || "",
            trendyolApiSecret: data.settings.trendyolApiSecret || "",
            trendyolSupplierId: data.settings.trendyolSupplierId || "",
            hepsiMerchantId: data.settings.hepsiMerchantId || "",
            hepsiSecretKey: data.settings.hepsiSecretKey || "",
            hepsiUserAgent: data.settings.hepsiUserAgent || "",
          });
        }
      } catch (error) {
        console.error("Ayarlar yüklenemedi:", error);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Lütfen önce giriş yapın");
        return;
      }

      const res = await fetch("/api/settings/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Hata oluştu");
        return;
      }

      setMessage("✅ Ayarlar kaydedildi");
    } catch (error) {
      console.error("Hata:", error);
      setMessage("❌ Sunucu hatası");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>API Ayarları</h1>
      <form onSubmit={handleSubmit}>
        <h2>Trendyol</h2>
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
        <input
          type="text"
          name="trendyolSupplierId"
          placeholder="Supplier ID"
          value={form.trendyolSupplierId}
          onChange={handleChange}
        />

        <h2>Hepsiburada</h2>
        <input
          type="text"
          name="hepsiMerchantId"
          placeholder="Merchant ID"
          value={form.hepsiMerchantId}
          onChange={handleChange}
        />
        <input
          type="text"
          name="hepsiSecretKey"
          placeholder="Secret Key"
          value={form.hepsiSecretKey}
          onChange={handleChange}
        />
        <input
          type="text"
          name="hepsiUserAgent"
          placeholder="User Agent"
          value={form.hepsiUserAgent}
          onChange={handleChange}
        />

        <button type="submit" style={{ marginTop: "1rem" }}>Kaydet</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
