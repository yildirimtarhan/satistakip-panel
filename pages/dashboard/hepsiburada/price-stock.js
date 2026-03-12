"use client";
import { useState, useCallback } from "react";

const headers = () => {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
};

export default function HepsiburadaPriceStockPage() {
  const [listings, setListings] = useState([]);
  const [erpProducts, setErpProducts] = useState([]);
  const [hbCatalogMap, setHbCatalogMap] = useState({}); // merchantSku/hbSku -> productName
  const [mappings, setMappings] = useState({}); // merchantSku -> productId (manuel eşleştirmeler)
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editPrice, setEditPrice] = useState({}); // { merchantSku: value }

  const buildCatalogMap = useCallback((catalogData, statusData) => {
    const map = {};
    const add = (sku, name) => {
      if (sku && name) map[String(sku).trim()] = name;
    };
    (catalogData?.data ?? []).forEach((p) => {
      const name = p.productName || p.name || p.title || p.UrunAdi;
      if (name) {
        add(p.merchantSku, name);
        add(p.hbSku, name);
      }
    });
    (statusData?.data ?? []).forEach((p) => {
      const name = p.productName || p.name || p.title;
      if (name) {
        add(p.merchantSku, name);
        add(p.hbSku, name);
      }
    });
    return map;
  }, []);

  const [salableOnly, setSalableOnly] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const salableParam = salableOnly ? "&salable=true" : "";
      const [listRes, catalogRes, statusRes] = await Promise.all([
        fetch(`/api/hepsiburada/listings/list?page=0&size=200&withNames=true${salableParam}`, { headers: headers() }),
        fetch("/api/hepsiburada/catalog/all-products?page=0&size=500", { headers: headers() }),
        fetch("/api/hepsiburada-api/catalog/list?productStatus=MATCHED&page=0&size=200"),
      ]);
      const listData = await listRes.json();
      const catalogData = await catalogRes.json();
      const statusData = await statusRes.json();
      if (listData.success && Array.isArray(listData.data)) setListings(listData.data);
      else       setMessage(listData.message || "Listing listesi alınamadı");
      setHbCatalogMap(buildCatalogMap(catalogData, statusData));
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setLoading(false);
  }, [buildCatalogMap, salableOnly]);

  const fetchErpProducts = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/products/list", { headers: headers() });
      const data = await res.json();
      const list = data?.products ?? data?.items ?? [];
      setErpProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setLoading(false);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const salableParam = salableOnly ? "&salable=true" : "";
      const [listRes, prodRes, catalogRes, statusRes, mapRes] = await Promise.all([
        fetch(`/api/hepsiburada/listings/list?page=0&size=200&withNames=true${salableParam}`, { headers: headers() }),
        fetch("/api/products/list", { headers: headers() }),
        fetch("/api/hepsiburada/catalog/all-products?page=0&size=500", { headers: headers() }),
        fetch("/api/hepsiburada-api/catalog/list?productStatus=MATCHED&page=0&size=200"),
        fetch("/api/hepsiburada/erp-mapping", { headers: headers() }),
      ]);
      const listData = await listRes.json();
      const prodData = await prodRes.json();
      const catalogData = await catalogRes.json();
      const statusData = await statusRes.json();
      const mapData = await mapRes.json();
      if (listData.success && Array.isArray(listData.data)) setListings(listData.data);
      const prods = prodData?.products ?? prodData?.items ?? [];
      setErpProducts(Array.isArray(prods) ? prods : []);
      setHbCatalogMap(buildCatalogMap(catalogData, statusData));
      setMappings(mapData.mappings || {});
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setLoading(false);
  }, [buildCatalogMap, salableOnly]);

  const matchErp = (listing) => {
    const sku = String(listing.merchantSku ?? "").trim();
    const productId = mappings[sku];
    if (productId) {
      const p = erpProducts.find((e) => String(e._id) === productId);
      if (p) return p;
    }
    return erpProducts.find(
      (p) =>
        String(p.barcode || "").trim() === sku ||
        String(p.sku || "").trim() === sku ||
        String(p.stockCode || "").trim() === sku
    );
  };

  const updateWithErpStock = async () => {
    const toSend = [];
    listings.forEach((row) => {
      const erp = matchErp(row);
      const merchantSku = row.merchantSku;
      const hepsiburadaSku = row.hepsiburadaSku ?? row.hbSku;
      if (!merchantSku && !hepsiburadaSku) return;
      const stock = erp != null ? Number(erp.stock ?? erp.quantity ?? 0) : null;
      const price = editPrice[merchantSku] != null ? Number(editPrice[merchantSku]) : (row.price != null ? Number(row.price) : null);
      toSend.push({
        merchantSku,
        hepsiburadaSku: hepsiburadaSku || undefined,
        ...(stock != null && !Number.isNaN(stock) ? { availableStock: Math.max(0, stock) } : {}),
        ...(price != null && !Number.isNaN(price) ? { price } : {}),
      });
    });
    const filtered = toSend.filter((r) => r.availableStock != null || r.price != null);
    if (filtered.length === 0) {
      setMessage("Güncellenecek kayıt yok. Önce 'Listeyi ve ERP ürünlerini çek' ile verileri yükleyin; ERP'de barkod/SKU, HB listing merchantSku ile aynı olmalı.");
      return;
    }
    setUpdateLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hepsiburada/listings/update-inventory", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(filtered),
      });
      const data = await res.json();
      if (data.success) setMessage(`Başarılı: ${data.message}`);
      else setMessage(data.message || "Güncelleme başarısız");
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setUpdateLoading(false);
  };

  const updateOnlyErpStock = async () => {
    const toSend = [];
    listings.forEach((row) => {
      const erp = matchErp(row);
      const merchantSku = row.merchantSku;
      const hepsiburadaSku = row.hepsiburadaSku ?? row.hbSku;
      if (!merchantSku && !hepsiburadaSku) return;
      if (erp == null) return;
      const stock = Number(erp.stock ?? erp.quantity ?? 0);
      if (Number.isNaN(stock)) return;
      toSend.push({
        merchantSku,
        hepsiburadaSku: hepsiburadaSku || undefined,
        availableStock: Math.max(0, stock),
      });
    });
    if (toSend.length === 0) {
      setMessage("ERP ile eşleşen listing yok. Merchant SKU ile ERP barkod/SKU aynı olmalı.");
      return;
    }
    setUpdateLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hepsiburada/listings/update-inventory", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(toSend),
      });
      const data = await res.json();
      if (data.success) setMessage(`Stok güncellendi: ${toSend.length} ürün (ERP ortak stok)`);
      else setMessage(data.message || "Güncelleme başarısız");
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setUpdateLoading(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Fiyat / Stok Güncelle</h1>
      <p className="text-gray-500 mb-6">
        Stok ortaktır: ERP&apos;deki ürün girişi ve pazaryeri satışları ERP stoktan düşer; bu sayfa HB listelerini ERP stoku ile günceller.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Yükleniyor…" : "Listeyi ve ERP ürünlerini çek"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={salableOnly} onChange={(e) => setSalableOnly(e.target.checked)} className="rounded" />
          Sadece aktif satıştaki
        </label>
        <button type="button" onClick={fetchListings} disabled={loading} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50">
          Sadece HB listesi
        </button>
        <button type="button" onClick={fetchErpProducts} disabled={loading} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50">
          Sadece ERP ürünleri
        </button>
        <button
          type="button"
          onClick={updateOnlyErpStock}
          disabled={updateLoading || listings.length === 0}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {updateLoading ? "Güncelleniyor…" : "Tümünü ERP stok ile güncelle"}
        </button>
        <button
          type="button"
          onClick={updateWithErpStock}
          disabled={updateLoading || listings.length === 0}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Stok + Fiyat güncelle (tablodaki fiyatlar)
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith("Başarılı") || message.startsWith("Stok güncellendi") ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {message}
        </div>
      )}

      {listings.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
          <h3 className="px-4 py-3 font-semibold border-b bg-amber-50">
            HB Listeleri – ERP eşleşen stok ile güncelleyebilirsiniz ({listings.length} kayıt)
          </h3>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Merchant SKU</th>
                  <th className="text-left px-4 py-2">HB SKU</th>
                  <th className="text-left px-4 py-2">Ürün adı</th>
                  <th className="text-right px-4 py-2">HB Fiyat</th>
                  <th className="text-right px-4 py-2">HB Stok</th>
                  <th className="text-left px-4 py-2">ERP Eşleşme</th>
                  <th className="text-right px-4 py-2">ERP Stok</th>
                  <th className="text-right px-4 py-2">Yeni fiyat</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((row, i) => {
                  const erp = matchErp(row);
                  const msku = row.merchantSku ?? "";
                  const hbName = hbCatalogMap[String(row.merchantSku || "").trim()] ?? hbCatalogMap[String(row.hepsiburadaSku || row.hbSku || "").trim()];
                  const displayName = erp ? (erp.name || erp.title) : hbName || null;
                  return (
                    <tr key={row.hepsiburadaSku || row.merchantSku || i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{row.merchantSku ?? "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.hepsiburadaSku ?? row.hbSku ?? "—"}</td>
                      <td className="px-4 py-2 max-w-xs truncate" title={displayName || ""}>{displayName ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{row.price != null ? Number(row.price).toLocaleString("tr-TR") : "—"}</td>
                      <td className="px-4 py-2 text-right">{row.availableStock ?? "—"}</td>
                      <td className="px-4 py-2">{erp ? <span className="text-green-700">Eşleşti</span> : <span className="text-gray-400">Eşleşme yok</span>}</td>
                      <td className="px-4 py-2 text-right">{erp != null ? (erp.stock ?? erp.quantity ?? 0) : "—"}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 border rounded px-2 py-1 text-right text-xs"
                          placeholder={row.price != null ? Number(row.price) : ""}
                          value={editPrice[msku] ?? ""}
                          onChange={(e) => setEditPrice((p) => ({ ...p, [msku]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {listings.length === 0 && !loading && (
        <p className="text-gray-500 py-6">Listeyi çekmek için &quot;Listeyi ve ERP ürünlerini çek&quot; veya &quot;Sadece HB listesi&quot; butonunu kullanın.</p>
      )}
    </div>
  );
}
