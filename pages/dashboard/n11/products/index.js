import { useEffect, useState, useCallback } from "react";

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 });

/* ── Badge ── */
function Badge({ color, children }) {
  const c = {
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-500 border-gray-200",
  }[color] || "bg-gray-100 text-gray-500 border-gray-200";
  return <span className={`text-xs px-2 py-0.5 rounded border font-medium ${c}`}>{children}</span>;
}

/* ── Toast ── */
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-xs pointer-events-auto flex gap-2 items-start
            ${t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-blue-600"}`}>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100">×</button>
        </div>
      ))}
    </div>
  );
}

/* ── Diff indicator ── */
function DiffBadge({ erpVal, n11Val, suffix = " TL" }) {
  if (!erpVal || !n11Val) return <span className="text-gray-300 text-xs">—</span>;
  const diff = Number(erpVal) - Number(n11Val);
  if (Math.abs(diff) < 0.01) return <Badge color="green">Eşit</Badge>;
  return (
    <span className={`text-xs font-medium ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
      {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))}{suffix}
    </span>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function N11ProductsPage() {
  const [products, setProducts]     = useState([]);
  const [erpProducts, setErpProducts] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState(new Set());
  const [editRow, setEditRow]       = useState({}); // { productId: { price, stock, listPrice } }
  const [rowLoading, setRowLoading] = useState({}); // { productId: true }
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toasts, setToasts]         = useState([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState("");

  const token = () => localStorage.getItem("token");
  const hdrs  = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  /* ── Toast ── */
  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const removeToast = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  /* ── N11 ürünleri çek ── */
  const fetchProducts = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/n11/products?page=${p}&size=20`, { headers: hdrs() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (e) {
      addToast("N11 ürünleri yüklenemedi: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page]);

  /* ── ERP ürünleri çek (karşılaştırma için) ── */
  const fetchErp = useCallback(async () => {
    try {
      const res  = await fetch("/api/products/list", { headers: hdrs() });
      const data = await res.json();
      setErpProducts(data.products || data.items || []);
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(0); fetchErp(); }, []);

  /* ── ERP eşleşmesi ── */
  const findErp = (n11Product) =>
    erpProducts.find((e) =>
      e.barcode === n11Product.barcode ||
      e.sku     === n11Product.sellerCode ||
      e.barkod  === n11Product.barcode
    );

  /* ── Filtrele ── */
  const filtered = products.filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.sellerCode?.includes(search)
  );

  /* ── Seçim ── */
  const toggleSelect = (id) => setSelected((s) => {
    const ns = new Set(s);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    return ns;
  });
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((p) => p._id || p.id)));

  /* ── Tekli fiyat/stok güncelle ── */
  const updateSingle = async (n11Product) => {
    const edit = editRow[n11Product._id || n11Product.id] || {};
    const sku = n11Product.sellerCode || n11Product.stockCode;
    if (!sku) { addToast("SKU bulunamadı", "error"); return; }

    const salePrice  = Number(edit.price    ?? n11Product.price    ?? 0);
    const listPrice  = Number(edit.listPrice ?? n11Product.listPrice ?? (salePrice * 1.1).toFixed(2));
    const quantity   = Number(edit.stock    ?? n11Product.stock    ?? n11Product.quantity ?? 0);

    const id = n11Product._id || n11Product.id;
    setRowLoading((r) => ({ ...r, [id]: true }));
    try {
      const res  = await fetch("/api/n11/products/bulk-price-stock", {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ skus: [{ stockCode: sku, salePrice, listPrice, quantity, currencyType: "TL" }] }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`✅ "${n11Product.title?.substring(0, 30)}..." güncellendi. Task: ${data.taskId}`);
        setEditRow((r) => { const nr = { ...r }; delete nr[id]; return nr; });
      } else {
        addToast(data.message || "Güncelleme hatası", "error");
      }
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setRowLoading((r) => ({ ...r, [id]: false }));
    }
  };

  /* ── Seçili toplu güncelle ── */
  const bulkUpdate = async () => {
    const toUpdate = filtered.filter((p) => selected.has(p._id || p.id));
    if (!toUpdate.length) { addToast("Önce ürün seçin", "error"); return; }

    const skus = toUpdate
      .filter((p) => p.sellerCode || p.stockCode)
      .map((p) => {
        const edit = editRow[p._id || p.id] || {};
        const salePrice = Number(edit.price    ?? p.price    ?? 0);
        const listPrice = Number(edit.listPrice ?? p.listPrice ?? (salePrice * 1.1).toFixed(2));
        const quantity  = Number(edit.stock    ?? p.stock    ?? p.quantity ?? 0);
        return { stockCode: p.sellerCode || p.stockCode, salePrice, listPrice, quantity, currencyType: "TL" };
      });

    if (!skus.length) { addToast("Seçili ürünlerin SKU'su yok", "error"); return; }

    setBulkLoading(true);
    try {
      const res  = await fetch("/api/n11/products/bulk-price-stock", {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ skus }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`✅ ${skus.length} ürün güncellendi. Task: ${data.taskId}`);
        setSelected(new Set());
      } else {
        addToast(data.message || "Hata", "error");
      }
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── ERP'ye aktar ── */
  const importToErp = async (n11Product) => {
    const erp = findErp(n11Product);
    if (erp) { addToast("Bu ürün zaten ERP'de mevcut", "info"); return; }
    addToast(`ERP import henüz aktif değil: ${n11Product.title?.substring(0, 40)}`, "info");
  };

  /* ── Inline edit ── */
  const setEdit = (id, field, val) =>
    setEditRow((r) => ({ ...r, [id]: { ...(r[id] || {}), [field]: val } }));

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">N11 Ürün Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} ürün · Sayfa {page + 1}/{totalPages}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => fetchProducts(page)} disabled={loading}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
          {selected.size > 0 && (
            <button onClick={bulkUpdate} disabled={bulkLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">
              {bulkLoading ? "Güncelleniyor…" : `Seçili ${selected.size} Ürünü Güncelle`}
            </button>
          )}
          <a href="/dashboard/pazaryeri-gonder"
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold">
            + Yeni Ürün Gönder
          </a>
        </div>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Ürün adı veya SKU ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <th className="p-3 w-8">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded" />
                </th>
                <th className="p-3 text-left">Ürün</th>
                <th className="p-3 text-right">SKU</th>
                <th className="p-3 text-right">N11 Fiyat</th>
                <th className="p-3 text-right">Yeni Satış Fiyatı</th>
                <th className="p-3 text-right">Yeni Liste Fiyatı</th>
                <th className="p-3 text-right">Stok</th>
                <th className="p-3 text-center">ERP</th>
                <th className="p-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">Yükleniyor…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">Ürün bulunamadı</td></tr>
              )}
              {!loading && filtered.map((p) => {
                const id  = p._id || p.id;
                const erp = findErp(p);
                const edit = editRow[id] || {};
                const isLoading = rowLoading[id];
                const sku = p.sellerCode || p.stockCode;
                const hasDiff = erp && (
                  Math.abs(Number(erp.price || 0) - Number(p.price || 0)) > 0.01 ||
                  Math.abs(Number(erp.stock || 0) - Number(p.stock || p.quantity || 0)) > 0
                );

                return (
                  <tr key={id} className={`hover:bg-gray-50 transition ${selected.has(id) ? "bg-blue-50" : ""}`}>
                    {/* Seç */}
                    <td className="p-3">
                      <input type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleSelect(id)}
                        className="rounded" />
                    </td>

                    {/* Ürün başlığı */}
                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-gray-800 leading-tight line-clamp-2">
                        {p.title}
                      </div>
                      {hasDiff && <span className="text-xs text-orange-500 font-medium">⚠ ERP ile fark var</span>}
                    </td>

                    {/* SKU */}
                    <td className="p-3 text-right text-gray-500 font-mono text-xs">{sku || "—"}</td>

                    {/* Mevcut N11 fiyatı */}
                    <td className="p-3 text-right">
                      <div className="font-semibold text-gray-800">{fmt(p.price)} TL</div>
                      {erp && <DiffBadge erpVal={erp.price} n11Val={p.price} />}
                    </td>

                    {/* Yeni satış fiyatı (inline edit) */}
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 border rounded px-2 py-1 text-right text-sm"
                        placeholder={fmt(erp?.price || p.price)}
                        value={edit.price ?? ""}
                        onChange={(e) => setEdit(id, "price", e.target.value)}
                      />
                    </td>

                    {/* Yeni liste fiyatı */}
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 border rounded px-2 py-1 text-right text-sm"
                        placeholder={fmt(p.listPrice || (Number(p.price || 0) * 1.1))}
                        value={edit.listPrice ?? ""}
                        onChange={(e) => setEdit(id, "listPrice", e.target.value)}
                      />
                    </td>

                    {/* Stok */}
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1 text-right text-sm"
                        placeholder={String(p.stock ?? p.quantity ?? 0)}
                        value={edit.stock ?? ""}
                        onChange={(e) => setEdit(id, "stock", e.target.value)}
                      />
                      {erp && Number(erp.stock || 0) !== Number(p.stock || p.quantity || 0) && (
                        <div className="text-xs text-gray-400">ERP: {erp.stock}</div>
                      )}
                    </td>

                    {/* ERP */}
                    <td className="p-3 text-center">
                      {erp
                        ? <Badge color="green">ERP'de Var</Badge>
                        : <button onClick={() => importToErp(p)}
                            className="text-xs text-blue-600 hover:underline">+ Aktar</button>
                      }
                    </td>

                    {/* İşlem */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => updateSingle(p)}
                        disabled={isLoading || !sku}
                        className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
                      >
                        {isLoading ? "…" : "Güncelle"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button disabled={page === 0} onClick={() => fetchProducts(page - 1)}
              className="px-3 py-1 border rounded text-sm disabled:opacity-40">← Önceki</button>
            <span className="px-3 py-1 text-sm text-gray-500">{page + 1} / {totalPages}</span>
            <button disabled={page + 1 >= totalPages} onClick={() => fetchProducts(page + 1)}
              className="px-3 py-1 border rounded text-sm disabled:opacity-40">Sonraki →</button>
          </div>
        )}
      </div>

      {/* Bilgi kutusu */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <b>Nasıl kullanılır:</b> Fiyat/stok alanlarını doldurup satır bazında <b>Güncelle</b> butonuna basın.
        Birden fazla ürünü checkbox ile seçip üstteki <b>Seçili X Ürünü Güncelle</b> butonuyla toplu güncelleyin.
        Boş bırakılan alanlar mevcut N11 değerini korur.
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
