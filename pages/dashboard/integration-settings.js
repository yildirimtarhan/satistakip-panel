"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/router";

export default function IntegrationSettings() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/login");

    try {
      const decoded = jwtDecode(token);

      if (decoded.role !== "admin") {
        router.push("/dashboard");
      } else {
        setAuthorized(true);
      }
    } catch (err) {
      router.push("/auth/login");
    }
  }, []);

  const createApiKey = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch("/api/dashboard/apikey/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Web Site Entegrasyonu",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      setApiKey(data.apiKey);
    } catch (err) {
      alert("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) return null;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">
        🔗 ERP API Entegrasyon Ayarları
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <p className="text-sm text-slate-600 mb-4">
          Bu API anahtarı dış web sitelerinin ERP sistemine bağlanmasını sağlar.
        </p>

        <button
          onClick={createApiKey}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          {loading ? "Oluşturuluyor..." : "Yeni API Key Oluştur"}
        </button>

        {apiKey && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
            <p className="font-semibold mb-2">Yeni Oluşturulan API Key:</p>

            <div className="flex gap-2">
              <input
                value={apiKey}
                readOnly
                className="flex-1 border px-3 py-2 rounded-lg text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(apiKey)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                Kopyala
              </button>
            </div>

            <p className="text-xs text-red-500 mt-3">
              ⚠️ Bu anahtarı güvenli saklayın. Kaybederseniz yeniden üretmeniz gerekir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}