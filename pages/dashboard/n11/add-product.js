// 📁 /pages/dashboard/n11/add-product.js
"use client";
import { useEffect, useState } from "react";

export default function AddProductToN11() {
  const [urunler, setUrunler] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/urunler", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUrunler(data || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const sendToN11 = async () => {
    if (!selected) return alert("Lütfen bir ürün seçin");

    setLoading(true);
    const token = localStorage.getItem("token");

    const res = await fetch("/api/n11/products/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId: selected })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) return alert("❌ Hata: " + data.message);
    alert("✅ Ürün başarıyla N11'e gönderildi!");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4">➕ Ürünü N11'e Gönder</h1>

      <select
        className="w-full border p-2 rounded mb-4"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Ürün seçin…</option>
        {urunler.map((u) => (
          <option key={u._id} value={u._id}>
            {u.ad} — {u.barkod}
          </option>
        ))}
      </select>

      <button
        onClick={sendToN11}
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
      >
        {loading ? "Gönderiliyor..." : "N11'e Gönder"}
      </button>
    </div>
  );
}
