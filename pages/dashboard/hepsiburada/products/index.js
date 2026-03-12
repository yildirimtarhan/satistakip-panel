"use client";
import { useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "MATCHED", label: "Eşleşmiş (MATCHED)" },
  { value: "CREATED", label: "Oluşturulmuş (CREATED)" },
  { value: "WAITING", label: "Beklemede (WAITING)" },
  { value: "IN_EXTERNAL_PROGRESS", label: "İşlemde (IN_EXTERNAL_PROGRESS)" },
  { value: "PRE_MATCHED", label: "Ön eşleşmiş (PRE_MATCHED)" },
  { value: "REJECTED", label: "Reddedilmiş (REJECTED)" },
  { value: "MATCHED_WITH_STAGED", label: "Staged (MATCHED_WITH_STAGED)" },
  { value: "MISSING_INFO", label: "Eksik bilgi (MISSING_INFO)" },
  { value: "BLOCKED", label: "Bloke (BLOCKED)" },
];

const headers = () => {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
};

export default function HepsiburadaProductsPage() {
  const [status, setStatus] = useState("MATCHED");
  const [pullLoading, setPullLoading] = useState(false);
  const [pullResult, setPullResult] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const [allCatalogLoading, setAllCatalogLoading] = useState(false);
  const [allCatalogResult, setAllCatalogResult] = useState(null);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsResult, setBrandsResult] = useState(null);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsResult, setListingsResult] = useState(null);
  const [salableOnly, setSalableOnly] = useState(false);

  const pullFromHb = async () => {
    setPullLoading(true);
    setPullResult(null);
    try {
      const res = await fetch(
        `/api/hepsiburada-api/catalog/list?productStatus=${encodeURIComponent(status)}&page=0&size=50`
      );
      const data = await res.json();
      setPullResult(data);
    } catch (err) {
      setPullResult({ success: false, error: err.message });
    }
    setPullLoading(false);
  };

  const fetchAllCatalog = async () => {
    setAllCatalogLoading(true);
    setAllCatalogResult(null);
    try {
      const res = await fetch("/api/hepsiburada/catalog/all-products?page=0&size=100", { headers: headers() });
      const data = await res.json();
      setAllCatalogResult(data);
    } catch (err) {
      setAllCatalogResult({ success: false, message: err.message });
    }
    setAllCatalogLoading(false);
  };

  const fetchBrandsAndAttributes = async () => {
    setBrandsLoading(true);
    setBrandsResult(null);
    try {
      const res = await fetch("/api/hepsiburada/catalog/brands?withAttributes=1", { headers: headers() });
      const data = await res.json();
      setBrandsResult(data);
    } catch (err) {
      setBrandsResult({ success: false, message: err.message });
    }
    setBrandsLoading(false);
  };

  const fetchListings = async () => {
    setListingsLoading(true);
    setListingsResult(null);
    try {
      // Listing + tüm katalog + statü listesi paralel çek (ürün adı eşleştirmesi için)
      const salableParam = salableOnly ? "&salable=true" : "";
      const [listRes, catalogRes, statusRes] = await Promise.all([
        fetch(`/api/hepsiburada/listings/list?page=0&size=200&withNames=true${salableParam}`, { headers: headers() }),
        fetch("/api/hepsiburada/catalog/all-products?page=0&size=500", { headers: headers() }),
        fetch("/api/hepsiburada-api/catalog/list?productStatus=MATCHED&page=0&size=200"),
      ]);
      const listData = await listRes.json();
      const catalogData = await catalogRes.json();
      const statusData = await statusRes.json();
      setListingsResult(listData);
      if (catalogData.success) setAllCatalogResult(catalogData);
      if (statusData.success) setPullResult(statusData);
    } catch (err) {
      setListingsResult({ success: false, message: err.message });
    }
    setListingsLoading(false);
  };

  const sendToHb = async () => {
    setSendLoading(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/hepsiburada-api/catalog/sync", {
        method: "POST",
        headers: headers(),
      });
      const data = await res.json();
      setSendResult(data);
    } catch (err) {
      setSendResult({ success: false, error: err.message });
    }
    setSendLoading(false);
  };

  const list = pullResult?.data ?? [];
  const total = pullResult?.totalElements ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Ürünleri</h1>
      <p className="text-gray-500 mb-6">
        Hepsiburada&apos;dan ürün listesi çekebilir veya kendi ürünlerinizi Hepsiburada&apos;ya toplu gönderebilirsiniz.
        {" "}
        <Link href="/dashboard/hepsiburada/price-stock" className="text-orange-600 hover:underline font-medium">
          Fiyat ve stok güncelleme
        </Link> için HB Fiyat/Stok Güncelle sayfasını kullanın.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hepsiburada'dan ürün çekme */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Hepsiburada&apos;dan ürün çek</h2>
          <p className="text-sm text-gray-500 mb-4">
            Statü bazlı ürün listesini Hepsiburada API&apos;den çeker (test ortamı: mpop-sit).
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={pullFromHb}
              disabled={pullLoading}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pullLoading ? "Çekiliyor..." : "Listeyi çek"}
            </button>
          </div>
          {pullResult && (
            <div className="mt-3 text-sm">
              {pullResult.success ? (
                <p className="text-green-700">
                  Toplam {total} ürün (sayfa: {pullResult.number ?? 0})
                </p>
              ) : (
                <p className="text-red-600">{pullResult.message || pullResult.error || "Hata"}</p>
              )}
            </div>
          )}
        </div>

        {/* Hepsiburada'ya ürün gönderme */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Hepsiburada&apos;ya ürün gönder</h2>
          <p className="text-sm text-gray-500 mb-4">
            Veritabanındaki tüm ürünleri Hepsiburada listeleme API&apos;sine gönderir (toplu sync).
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              type="button"
              onClick={sendToHb}
              disabled={sendLoading}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendLoading ? "Gönderiliyor..." : "Ürünleri Hepsiburada'ya gönder"}
            </button>
            <Link
              href="/dashboard/pazaryeri-gonder"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              Tek ürün gönder (Pazaryeri)
            </Link>
          </div>
          {sendResult && (
            <div className="mt-3 text-sm">
              {sendResult.success ? (
                <p className="text-green-700">{sendResult.count ?? 0} ürün işlendi</p>
              ) : (
                <p className="text-red-600">{sendResult.message || sendResult.error || "Hata"}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tüm katalog (SKU, varyant, marka) + Marka / model / kapasite + Listing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Tüm katalog</h2>
          <p className="text-xs text-gray-500 mb-3">
            Hepsiburada katalog API&apos;den mağaza ürünleri çekilir; aşağıda tabloda gösterilir. Test hesabında henüz ürün yoksa 0 görünür.
          </p>
          <button
            type="button"
            onClick={fetchAllCatalog}
            disabled={allCatalogLoading}
            className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {allCatalogLoading ? "Çekiliyor..." : "Tüm katalog çek"}
          </button>
          {allCatalogResult && (
            <p className="mt-2 text-sm">
              {allCatalogResult.success
                ? `${allCatalogResult.totalElements ?? allCatalogResult.data?.length ?? 0} ürün`
                : <span className="text-red-600">{allCatalogResult.message || allCatalogResult.error}</span>}
            </p>
          )}
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Marka / model / kapasite</h2>
          <p className="text-xs text-gray-500 mb-3">
            Tüm katalog çekildikten sonra marka/model/kapasite burada listelenir. Katalog boşsa 0 marka görünür.
          </p>
          <button
            type="button"
            onClick={fetchBrandsAndAttributes}
            disabled={brandsLoading}
            className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {brandsLoading ? "Çekiliyor..." : "Marka ve özellikleri çek"}
          </button>
          {brandsResult && (
            <div className="mt-2 text-sm">
              {brandsResult.success ? (
                <>
                  <p className="text-green-700">{brandsResult.brands?.length ?? 0} marka</p>
                  {brandsResult.model?.length > 0 && <p className="text-gray-600">{brandsResult.model.length} model</p>}
                  {brandsResult.kapasite?.length > 0 && <p className="text-gray-600">{brandsResult.kapasite.length} kapasite</p>}
                </>
              ) : <span className="text-red-600">{brandsResult.message}</span>}
            </div>
          )}
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Listing listesi</h2>
          <p className="text-xs text-gray-500 mb-3">
            Hepsiburada Listeleme API&apos;den fiyat, stok, kargo bilgileri çekilir; aşağıda tabloda gösterilir (veritabanına kaydedilmez).
          </p>
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={salableOnly} onChange={(e) => setSalableOnly(e.target.checked)} className="rounded" />
            <span className="text-sm">Sadece aktif satıştaki</span>
          </label>
          <button
            type="button"
            onClick={fetchListings}
            disabled={listingsLoading}
            className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            {listingsLoading ? "Çekiliyor..." : "Listing listesi çek"}
          </button>
          {listingsResult && (
            <p className="mt-2 text-sm">
              {listingsResult.success
                ? `${listingsResult.data?.length ?? 0} listing (toplam: ${listingsResult.totalElements ?? 0})`
                : <span className="text-red-600">{listingsResult.message}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Listing listesi tablosu - Ürün adı katalogdan eşleştirilir */}
      {listingsResult?.success && (listingsResult.data?.length > 0) && (() => {
        const catalogMap = {};
        const addToMap = (sku, name) => {
          if (sku && name) catalogMap[String(sku).trim()] = name;
        };
        // 1) Tüm katalog (all-products-of-merchant)
        (allCatalogResult?.data ?? []).forEach((p) => {
          const name = p.productName || p.name || p.title || p.UrunAdi;
          if (name) {
            addToMap(p.merchantSku, name);
            addToMap(p.hbSku, name);
            (p.variants || []).forEach((v) => addToMap(v.merchantSku, name));
          }
        });
        // 2) Statü bazlı liste (products-by-merchant-and-status) - productName içerir
        (pullResult?.data ?? []).forEach((p) => {
          const name = p.productName || p.name || p.title;
          if (name) {
            addToMap(p.merchantSku, name);
            addToMap(p.hbSku, name);
          }
        });
        return (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
          <h3 className="px-4 py-3 font-semibold border-b bg-amber-50">
            Listing listesi – fiyat, stok, kargo ({listingsResult.totalElements ?? listingsResult.data.length})
            <Link href="/dashboard/hepsiburada/price-stock" className="ml-3 text-sm text-orange-600 hover:underline font-normal">
              → Fiyat/Stok güncelle
            </Link>
          </h3>
          <p className="px-4 py-2 text-xs text-gray-500 bg-amber-50/50">
            Ürün adları katalog ve statü listesinden eşleştirilir. HB kataloğundan açılan ürünlerde ad görünmeyebilir.
          </p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Merchant SKU</th>
                  <th className="text-left px-4 py-2">HB SKU</th>
                  <th className="text-left px-4 py-2">Ürün adı</th>
                  <th className="text-right px-4 py-2">Fiyat</th>
                  <th className="text-right px-4 py-2">Stok</th>
                  <th className="text-left px-4 py-2">Kargo süre</th>
                  <th className="text-left px-4 py-2">Satışta</th>
                </tr>
              </thead>
              <tbody>
                {listingsResult.data.map((row, i) => (
                  <tr key={row.merchantSku || row.hepsiburadaSku || i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.merchantSku ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.hepsiburadaSku ?? "—"}</td>
                    <td className="px-4 py-2 max-w-xs truncate" title={row.productName || catalogMap[String(row.merchantSku||"").trim()] || catalogMap[String(row.hepsiburadaSku||"").trim()] || ""}>
                      {row.productName ?? catalogMap[String(row.merchantSku||"").trim()] ?? catalogMap[String(row.hepsiburadaSku||"").trim()] ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">{row.price != null ? Number(row.price).toLocaleString("tr-TR") : "—"}</td>
                    <td className="px-4 py-2 text-right">{row.availableStock ?? "—"}</td>
                    <td className="px-4 py-2">{row.dispatchTime != null ? `${row.dispatchTime} gün` : "—"}</td>
                    <td className="px-4 py-2">{row.isSalable === true ? "Evet" : "Hayır"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* Tüm katalog tablosu */}
      {allCatalogResult?.success && (allCatalogResult.data?.length > 0) && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
          <h3 className="px-4 py-3 font-semibold border-b bg-indigo-50">Tüm katalog ({allCatalogResult.totalElements ?? allCatalogResult.data.length})</h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Merchant SKU</th>
                  <th className="text-left px-4 py-2">HB SKU</th>
                  <th className="text-left px-4 py-2">Varyant Grubu</th>
                  <th className="text-left px-4 py-2">Marka</th>
                  <th className="text-left px-4 py-2">Ürün adı</th>
                  <th className="text-left px-4 py-2">Statü</th>
                </tr>
              </thead>
              <tbody>
                {allCatalogResult.data.map((row, i) => (
                  <tr key={row.merchantSku || row.hbSku || i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.merchantSku ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.hbSku ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.variantGroupId ?? "—"}</td>
                    <td className="px-4 py-2">{row.brand ?? "—"}</td>
                    <td className="px-4 py-2">{row.productName ?? "—"}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-200">{row.status ?? "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marka / model / kapasite özet */}
      {brandsResult?.success && (brandsResult.brands?.length > 0 || brandsResult.model?.length > 0 || brandsResult.kapasite?.length > 0) && (
        <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-semibold border-b pb-2 mb-3">Marka / model / kapasite</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {brandsResult.brands?.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Markalar ({brandsResult.brands.length})</p>
                <p className="text-gray-500 truncate max-h-24 overflow-y-auto">{brandsResult.brands.join(", ")}</p>
              </div>
            )}
            {brandsResult.model?.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Model ({brandsResult.model.length})</p>
                <p className="text-gray-500 truncate max-h-24 overflow-y-auto">{brandsResult.model.join(", ")}</p>
              </div>
            )}
            {brandsResult.kapasite?.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Kapasite ({brandsResult.kapasite.length})</p>
                <p className="text-gray-500 truncate max-h-24 overflow-y-auto">{brandsResult.kapasite.join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Çekilen liste tablosu (statü bazlı) */}
      {list.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <h3 className="px-4 py-3 font-semibold border-b bg-gray-50">Hepsiburada ürün listesi ({total})</h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Merchant SKU</th>
                  <th className="text-left px-4 py-2">HB SKU</th>
                  <th className="text-left px-4 py-2">Ürün adı</th>
                  <th className="text-left px-4 py-2">Statü</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, i) => (
                  <tr key={row.merchantSku || i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.merchantSku ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.hbSku ?? "—"}</td>
                    <td className="px-4 py-2">{row.productName ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-200">{row.productStatus ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pullResult?.success && list.length === 0 && total === 0 && (
        <p className="text-gray-500 text-center py-6">Bu statüde kayıt bulunamadı.</p>
      )}
    </div>
  );
}
