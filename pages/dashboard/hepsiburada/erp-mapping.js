"use client";
import { useState, useCallback } from "react";
import Link from "next/link";

const headers = () => {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
};

export default function HBErpMappingPage() {
  const [listings, setListings] = useState([]);
  const [erpProducts, setErpProducts] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [pendingMap, setPendingMap] = useState({}); // merchantSku -> productId
  const [salableOnly, setSalableOnly] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const salableParam = salableOnly ? "&salable=true" : "";
      const [listRes, prodRes, mapRes] = await Promise.all([
        fetch(`/api/hepsiburada/listings/list?page=0&size=300&withNames=true${salableParam}`, { headers: headers() }),
        fetch("/api/products/list", { headers: headers() }),
        fetch("/api/hepsiburada/erp-mapping", { headers: headers() }),
      ]);
      const listData = await listRes.json();
      const prodData = await prodRes.json();
      const mapData = await mapRes.json();
      if (listData.success && Array.isArray(listData.data)) setListings(listData.data);
      else setMessage(listData.message || "HB listesi alınamadı");
      setErpProducts(prodData?.products ?? prodData?.items ?? []);
      setMappings(mapData.mappings || {});
      setPendingMap({});
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setLoading(false);
  }, [salableOnly]);

  const matchErp = useCallback(
    (listing) => {
      const sku = String(listing.merchantSku || "").trim();
      const manualProductId = pendingMap[sku] ?? mappings[sku];
      if (manualProductId) {
        const p = erpProducts.find((e) => String(e._id) === manualProductId);
        if (p) return { product: p, source: "manual" };
      }
      const auto = erpProducts.find(
        (p) =>
          String(p.barcode || "").trim() === sku ||
          String(p.sku || "").trim() === sku ||
          String(p.stockCode || "").trim() === sku
      );
      return auto ? { product: auto, source: "auto" } : null;
    },
    [erpProducts, mappings, pendingMap]
  );

  const saveMappings = async () => {
    const toSave = Object.entries(pendingMap).filter(([, v]) => v);
    if (toSave.length === 0) {
      setMessage("Kaydedilecek eşleştirme yok.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hepsiburada/erp-mapping", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          items: toSave.map(([merchantSku, productId]) => ({ merchantSku, productId })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMappings((prev) => ({ ...prev, ...Object.fromEntries(toSave) }));
        setPendingMap({});
        setMessage(`✅ ${toSave.length} eşleştirme kaydedildi.`);
      } else setMessage(data.message || "Kayıt başarısız");
    } catch (e) {
      setMessage(e.message || "Hata");
    }
    setSaving(false);
  };

  const setMapping = (merchantSku, productId) => {
    setPendingMap((p) => {
      const next = { ...p };
      if (productId) next[merchantSku] = productId;
      else delete next[merchantSku];
      return next;
    });
  };

  const openInErp = async () => {
    const unmatched = listings.filter((r) => !matchErp(r));
    const withSku = unmatched.filter((r) => String(r.merchantSku ?? "").trim());
    if (withSku.length === 0) {
      setMessage("ERP'de açılacak eşleşmemiş ürün yok. Önce listeyi çekin.");
      return;
    }
    setCreating(true);
    setMessage(null);
    let ok = 0;
    let fail = 0;
    for (const row of withSku) {
      const msku = String(row.merchantSku).trim();
      try {
        const res = await fetch("/api/products/add", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            name: row.productName || `HB-${msku}`,
            barcode: msku,
            sku: msku,
            stock: row.availableStock ?? 0,
            priceTl: row.price ?? 0,
            sendTo: {},
          }),
        });
        const data = await res.json();
        if (data.success) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    setMessage(`✅ ${ok} ürün ERP'de açıldı.${fail ? ` ${fail} başarısız.` : ""}`);
    setCreating(false);
    loadAll();
  };

  const matchedCount = listings.filter((r) => matchErp(r)).length;
  const unmatchedCount = listings.length - matchedCount;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">HB – ERP Eşleştirme</h1>
      <p className="text-gray-500 mb-6">
        Önce eşleşmeyen HB ürünlerini ERP&apos;de açın, sonra otomatik eşleşirler (barkod = Merchant SKU). Manuel eşleştirme gerekirse dropdown ile seçin.
      </p>
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={salableOnly} onChange={(e) => setSalableOnly(e.target.checked)} className="rounded" />
          Sadece aktif satıştaki
        </label>
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Yükleniyor…" : "Listeleri çek"}
        </button>
        <button
          type="button"
          onClick={openInErp}
          disabled={creating || listings.length === 0 || listings.filter((r) => !matchErp(r) && String(r.merchantSku ?? "").trim()).length === 0}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          title="Eşleşmeyen HB ürünlerini ERP'de yeni ürün olarak oluşturur (barkod=Merchant SKU)"
        >
          {creating ? "ERP'de açılıyor…" : "Eşleşmeyenleri ERP'de aç"}
        </button>
        {Object.keys(pendingMap).length > 0 && (
          <button
            type="button"
            onClick={saveMappings}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : `${Object.keys(pendingMap).length} eşleştirmeyi kaydet`}
          </button>
        )}
        <Link href="/dashboard/hepsiburada/price-stock" className="text-orange-600 hover:underline text-sm">
          → Fiyat/Stok güncelle
        </Link>
      </div>
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {message}
        </div>
      )}
      {listings.length > 0 && (
        <>
          <div className="mb-4 flex gap-4 text-sm">
            <span className="text-green-700 font-medium">✓ {matchedCount} eşleşti</span>
            <span className="text-amber-700 font-medium">○ {unmatchedCount} eşleşmedi</span>
          </div>
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
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
                    <th className="text-left px-4 py-2">ERP Ürün</th>
                    <th className="text-right px-4 py-2">ERP Stok</th>
                    <th className="text-left px-4 py-2">Manuel eşleştir</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((row, i) => {
                    const m = matchErp(row);
                    const msku = row.merchantSku ?? "";
                    return (
                      <tr
                        key={row.hepsiburadaSku || msku || i}
                        className={`border-t border-gray-100 hover:bg-gray-50 ${!m ? "bg-amber-50/50" : ""}`}
                      >
                        <td className="px-4 py-2 font-mono text-xs">{msku || "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.hepsiburadaSku ?? row.hbSku ?? "—"}</td>
                        <td className="px-4 py-2 max-w-xs truncate" title={row.productName || ""}>
                          {row.productName ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.price != null ? Number(row.price).toLocaleString("tr-TR") : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">{row.availableStock ?? "—"}</td>
                        <td className="px-4 py-2">
                          {m ? (
                            <span className={m.source === "manual" ? "text-blue-700" : "text-green-700"}>
                              {m.source === "manual" ? "Manuel" : "Otomatik"}
                            </span>
                          ) : (
                            <span className="text-amber-600">Eşleşmedi</span>
                          )}
                        </td>
                        <td className="px-4 py-2 max-w-[200px] truncate">
                          {m ? (m.product.name || m.product.title || m.product.barcode || "—") : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">{m ? (m.product.stock ?? m.product.quantity ?? "—") : "—"}</td>
                        <td className="px-4 py-2">
                          <select
                            className="border rounded px-2 py-1 text-xs w-48 max-w-full"
                            value={pendingMap[msku] ?? mappings[msku] ?? ""}
                            onChange={(e) => setMapping(msku, e.target.value || null)}
                          >
                            <option value="">— ERP seç —</option>
                            {erpProducts.map((p) => (
                              <option key={p._id} value={p._id}>
                                {(p.name || p.title || p.barcode || p.sku || p._id).toString().slice(0, 40)}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {listings.length === 0 && !loading && (
        <p className="text-gray-500 py-6">Listeleri çekmek için &quot;Listeleri çek&quot; butonuna tıklayın.</p>
      )}
    </div>
  );
}
