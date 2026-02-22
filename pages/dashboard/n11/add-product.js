"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function N11AddProductPage() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // ✅ ERP ürünlerini getir (DOĞRU endpoint)
  const fetchERPProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/products/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      const list =
        data?.products ||
        data?.data ||
        data?.urunler ||
        data?.items ||
        [];

      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("ERP ürün çekme hatası:", err);
      alert("ERP ürünleri alınamadı!");
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchERPProducts();
  }, []);

  // ✅ Ürünü N11'e gönder
  const handleSendToN11 = async () => {
    if (!selectedId) {
      alert("Lütfen bir ürün seç!");
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem("token");

      const res = await fetch("/api/n11/products/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: selectedId }),
      });

      const data = await res.json();

      if (data?.success) {
        alert(
          `N11'e gönderildi ✅\nTaskId: ${data.taskId}\n\n(N11 paneline birkaç dakika sonra düşer)`
        );
      } else {
        alert(`N11 gönderim başarısız ❌\n${data?.message || "Bilinmeyen hata"}`);
      }
    } catch (err) {
      console.error("N11 gönderim hatası:", err);
      alert("N11 gönderim hatası!");
    }

    setSending(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">➕ Ürünü N11'e Gönder</h1>

      <select
        className="w-full border p-2 rounded"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Ürün seçin...</option>

        {products.map((p) => {
          const title = p?.name || p?.title || "Ürün";
          const barcode = p?.barcode || p?.barkod;
          const sku = p?.sku || p?.productSellerCode;

          return (
            <option key={p._id} value={p._id}>
              {title}
              {barcode
                ? ` | ${barcode}`
                : sku
                ? ` | ${sku}`
                : " | Barkod yok"}
            </option>
          );
        })}
      </select>

      <div className="flex gap-3 mt-4">
        <Button onClick={fetchERPProducts} disabled={loading}>
          {loading ? "Yükleniyor..." : "ERP Ürünleri Yenile"}
        </Button>

        <Button
          onClick={handleSendToN11}
          disabled={sending || loading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {sending ? "Gönderiliyor..." : "N11'e Gönder"}
        </Button>
      </div>
    </div>
  );
}
