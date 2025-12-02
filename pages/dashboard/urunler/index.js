// 📁 /pages/dashboard/urunler/index.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Küçük helper: Pazaryeri status badge
const StatusBadge = ({ label, status }) => {
  const normalized = (status || "Not Sent").toLowerCase();

  let bg = "bg-gray-100 text-gray-700 border-gray-200";
  if (normalized === "success" || normalized === "approved" || normalized === "active") {
    bg = "bg-emerald-100 text-emerald-700 border-emerald-200";
  } else if (normalized === "pending" || normalized === "waiting") {
    bg = "bg-amber-100 text-amber-700 border-amber-200";
  } else if (normalized === "error" || normalized === "rejected") {
    bg = "bg-red-100 text-red-700 border-red-200";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${bg}`}>
      <span className="font-semibold mr-1">{label}:</span>
      <span>{status || "Not Sent"}</span>
    </span>
  );
};

export default function UrunlerListPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Ürünleri çek
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/products/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || [];
      setProducts(list);
      setFiltered(list);
    } catch (err) {
      console.error("Ürün listeleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Arama filtreleme
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      products.filter((p) => {
        const name = p.name?.toLowerCase() || "";
        const sku = p.sku?.toLowerCase() || "";
        const barcode = p.barcode?.toLowerCase() || "";
        return (
          name.includes(q) ||
          sku.includes(q) ||
          barcode.includes(q)
        );
      })
    );
  }, [search, products]);

  // Ürün sil
  const deleteProduct = async (id) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/products/delete?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      alert("✅ Ürün silindi");
      fetchProducts();
    } else {
      const data = await res.json().catch(() => ({}));
      alert("❌ Ürün silinemedi: " + (data.message || `HTTP ${res.status}`));
    }
  };

  return (
    <div className="p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            📦 Ürünler
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ERP’ye kayıtlı tüm ürünleri buradan yönetebilir, düzenleyebilir ve silebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
          >
            🔄 Listeyi Yenile
          </Button>

          <Link href="/dashboard/urunler/yeni">
            <Button size="sm">➕ Yeni Ürün</Button>
          </Link>
        </div>
      </div>

      {/* Arama Alanı */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="max-w-sm w-full">
          <Input
            placeholder="Ürün adı, SKU veya barkod ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading && (
          <span className="text-xs text-slate-500">
            Liste yenileniyor...
          </span>
        )}
      </div>

      {/* Ürün Tablosu */}
      <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left w-12">#</th>
              <th className="p-2 text-left">Görsel</th>
              <th className="p-2 text-left">Ürün Adı</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Barkod</th>
              <th className="p-2 text-right">Stok</th>
              <th className="p-2 text-right">Fiyat (TL)</th>
              <th className="p-2 text-left">Pazaryeri Durumları</th>
              <th className="p-2 text-right">İşlemler</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p, i) => (
              <tr key={p._id} className="border-b hover:bg-gray-50">
                <td className="p-2 align-middle">{i + 1}</td>

                <td className="p-2 align-middle">
                  {p.images?.length > 0 ? (
                    <img
                      src={p.images[0]}
                      className="w-12 h-12 rounded object-cover border"
                      alt={p.name || "Ürün"}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border border-dashed flex items-center justify-center text-xs text-slate-400">
                      Yok
                    </div>
                  )}
                </td>

                <td className="p-2 align-middle">
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    {p.category && (
                      <span className="text-[11px] text-slate-500">
                        {p.category}
                      </span>
                    )}
                  </div>
                </td>

                <td className="p-2 align-middle">{p.sku || "—"}</td>
                <td className="p-2 align-middle">{p.barcode || "—"}</td>

                <td className="p-2 text-right align-middle">
                  <span className={Number(p.stock) <= 0 ? "text-red-600 font-semibold" : "font-semibold"}>
                    {p.stock ?? 0}
                  </span>
                </td>

                <td className="p-2 text-right align-middle">
                  {p.priceTl ? `${p.priceTl.toFixed ? p.priceTl.toFixed(2) : p.priceTl} ₺` : "—"}
                </td>

                {/* Pazaryeri Durumları */}
                <td className="p-2 align-middle">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge
                      label="N11"
                      status={p.marketplaces?.n11?.status}
                    />
                    <StatusBadge
                      label="Trendyol"
                      status={p.marketplaces?.trendyol?.status}
                    />
                    <StatusBadge
                      label="HB"
                      status={p.marketplaces?.hepsiburada?.status}
                    />
                  </div>
                </td>

                {/* İşlemler */}
                <td className="p-2 text-right align-middle">
                  <div className="inline-flex gap-1">
                    <Link href={`/dashboard/urunler/duzenle/${p._id}`}>
                      <Button size="sm" variant="outline">
                        ✏️ Düzenle
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteProduct(p._id)}
                    >
                      🗑️ Sil
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="text-center p-4 text-gray-500">
                  Ürün bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
