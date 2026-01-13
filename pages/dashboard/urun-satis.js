// /pages/dashboard/urun-satis.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { apiPut } from "@/utils/api";




/**
 * ✅ Tailwind-only satış ekranı
 * - Bootstrap / container / row / col yok
 * - RequireAuth yok (zaten _app + DashboardLayout sarıyor)
 * - Multi-tenant: token ile backend filtreliyor
 *
 * Kullandığı API'ler (senin sistem):
 * GET  /api/cari
 * GET  /api/products/list
 * POST /api/cari/next-sale-no
 * GET  /api/cari/ekstre?accountId=...&start=...&end=...
 * POST /api/satis/create
 */

// ---------- helpers ----------
const todayISO = () => new Date().toISOString().slice(0, 10);

const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const safeNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

async function apiGet(url, token) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(data?.message || `${res.status} ${res.statusText}`);
  }
  return data;
}

async function apiPost(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "API Hatası");
  }

  return await res.json(); // 🔥 BU SATIR ŞART
}


function cariDisplayName(c) {
  return (
    c?.unvan ||
    c?.name ||
    c?.cariAdi ||
    c?.title ||
    c?.ad ||
    c?.firmaAdi ||
    c?.email ||
    "İsimsiz Cari"
  );
}

function normalizeCariList(raw) {
  const arr =
    Array.isArray(raw) ? raw : raw?.accounts || raw?.cariler || raw?.data || raw?.items || [];
  const list = Array.isArray(arr) ? arr : [];
  return list
    .map((c) => ({
      ...c,
      _id: c?._id || c?.id,
      unvan: c?.unvan || c?.name || c?.cariAdi || c?.title || "",
      email: c?.email || "",
    }))
    .filter((x) => x?._id);
}

function normalizeProductList(raw) {
  const arr =
    Array.isArray(raw) ? raw : raw?.products || raw?.urunler || raw?.data || raw?.items || [];
  const list = Array.isArray(arr) ? arr : [];
  return list
    .map((p) => {
      const stock = safeNum(p?.stock ?? p?.stok, 0);
      const price = safeNum(p?.satisFiyati ?? p?.priceTl ?? p?.price, 0);
      const vatRate = safeNum(p?.vatRate ?? p?.kdv, 20);

      return {
        ...p,
        _id: p?._id || p?.id,
        name: p?.name ?? p?.ad ?? "",
        ad: p?.ad ?? p?.name ?? "",
        barcode: p?.barcode ?? p?.barkod ?? "",
        barkod: p?.barkod ?? p?.barcode ?? "",
        sku: p?.sku ?? p?.stokKodu ?? "",
        stock,
        vatRate,
        satisFiyati: price,
      };
    })
    .filter((x) => x?._id);
}

// PDF (merkezi mantık gibi davranacak şekilde: burada tek fonksiyon)
async function buildSalePdf({ title, metaRows, items, totals, currency }) {
  const jsPDFMod = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const jsPDF = jsPDFMod.jsPDF;
  const autoTable = autoTableMod.default || autoTableMod;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const marginX = 40;
  let y = 40;

  doc.setFontSize(14);
  doc.text(title || "Satış (Taslak)", marginX, y);
  y += 18;

  doc.setFontSize(10);
  for (const row of metaRows || []) {
    doc.text(String(row), marginX, y);
    y += 14;
  }
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Ürün", "Barkod", "SKU", "Adet", "Birim", "KDV%", "Toplam"]],
    body: (items || []).map((r) => [
      r?.name || "",
      r?.barcode || "",
      r?.sku || "",
      String(r?.quantity ?? 1),
      fmt(r?.unitPrice || 0),
      String(r?.vatRate ?? 20),
      `${fmt(r?.lineTotal || 0)} ${currency}`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fontSize: 9 },
    margin: { left: marginX, right: marginX },
  });

  const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : y + 18;

  doc.setFontSize(10);
  doc.text(`Ara Toplam: ${fmt(totals?.ara || 0)} ${currency}`, marginX, finalY);
  doc.text(`KDV: ${fmt(totals?.kdv || 0)} ${currency}`, marginX + 220, finalY);
  doc.text(`Genel: ${fmt(totals?.genel || 0)} ${currency}`, marginX + 360, finalY);
  doc.text(`TRY: ${fmt(totals?.genelTRY || 0)} TRY`, marginX + 520, finalY);

  return doc;
}

// ---------- page ----------
export default function UrunSatisPage() {
    const router = useRouter();
  const editSaleNo = router.query.saleNo || null;
  const isEdit = Boolean(editSaleNo);


  // auth/token
  const [token, setToken] = useState("");

  // data
  const [cariler, setCariler] = useState([]);
  const [products, setProducts] = useState([]);

  // form
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [currency, setCurrency] = useState("TRY");
  const [fxRate, setFxRate] = useState(1);
  const [manualRate, setManualRate] = useState(false);

  const [paymentType, setPaymentType] = useState("acik"); // acik/nakit/kart/havale
  const [partialPaymentTRY, setPartialPaymentTRY] = useState(0);
  const [note, setNote] = useState("");
  const [saleNo, setSaleNo] = useState("");

  // ui state
  const [query, setQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // balance
  const [currentBalanceTRY, setCurrentBalanceTRY] = useState(0);

  // cart
  const [cart, setCart] = useState([]);

  const barcodeRef = useRef(null);

  // loaders
  const loadCariler = async (t) => {
    const d = await apiGet("/api/cari", t);
    const list = normalizeCariList(d);
    list.sort((a, b) => (cariDisplayName(a) > cariDisplayName(b) ? 1 : -1));
    setCariler(list);
  };

  const loadProducts = async (t) => {
    const d = await apiGet("/api/products/list", t);
    const normalized = normalizeProductList(d);
    // satış ekranında sadece stok > 0
    setProducts(normalized.filter((p) => safeNum(p?.stock, 0) > 0));
  };

  const getNextSaleNo = async (t) => {
    const d = await apiPost("/api/cari/next-sale-no", t, {});
    const no = d?.saleNo || d?.satisNo || d?.nextSaleNo || d?.no || "";
    if (no) setSaleNo(no);
  };

  const loadCariBalanceFromEkstre = async (t, accId) => {
    if (!accId) {
      setCurrentBalanceTRY(0);
      return;
    }
    const start = "2000-01-01";
    const end = todayISO();
    const d = await apiGet(`/api/cari/ekstre?accountId=${accId}&start=${start}&end=${end}`, t);

    const rows = Array.isArray(d) ? d : d?.rows || d?.transactions || d?.data || [];
    const list = Array.isArray(rows) ? rows : [];
    const last = list[list.length - 1] || null;

    const balCandidate =
      (Number.isFinite(safeNum(last?.bakiye, NaN)) ? safeNum(last?.bakiye, NaN) : NaN) ??
      (Number.isFinite(safeNum(last?.balance, NaN)) ? safeNum(last?.balance, NaN) : NaN);

    const bal =
      Number.isFinite(safeNum(last?.bakiye, NaN)) ? safeNum(last?.bakiye, NaN) : null;

    const finalBal =
      Number.isFinite(safeNum(last?.bakiye, NaN))
        ? safeNum(last?.bakiye, 0)
        : Number.isFinite(safeNum(last?.balance, NaN))
        ? safeNum(last?.balance, 0)
        : Number.isFinite(safeNum(d?.bakiye, NaN))
        ? safeNum(d?.bakiye, 0)
        : Number.isFinite(safeNum(d?.balance, NaN))
        ? safeNum(d?.balance, 0)
        : 0;

    setCurrentBalanceTRY(finalBal);
  };

  // init
  useEffect(() => {
  const t = Cookies.get("token") || localStorage.getItem("token") || "";
  if (!t) return;

  setToken(t);

  (async () => {
    try {
      setErrMsg("");
      await loadCariler(t);
      await loadProducts(t);

      if (editSaleNo) {
        // 🔥 SATIŞI GETİR (EDIT)
        const data = await apiGet(`/api/sales/get?saleNo=${editSaleNo}`, t);

        setSaleNo(data.saleNo);
        setAccountId(data.accountId);
        setDate(data.date?.slice(0, 10) || todayISO());
        setCurrency(data.currency || "TRY");
        setFxRate(data.fxRate || 1);
        setPaymentType(data.paymentType || "acik");
        setNote(data.note || "");

        setCart(
          (data.items || []).map((i) => ({
            productId: i.productId,
            name: i.name,
            barcode: i.barcode || "",
            sku: i.sku || "",
            quantity: i.qty || 1,
            unitPrice: i.unitPrice || 0,
            vatRate: i.vatRate || 20,
          }))
        );
      } else {
        // 🆕 YENİ SATIŞ
        await getNextSaleNo(t);
      }
    } catch (e) {
      setErrMsg(e?.message || "Veriler yüklenemedi");
    }
  })();
}, [editSaleNo]);


  // balance when cari changes
  useEffect(() => {
    if (!token) return;
    if (!accountId) {
      setCurrentBalanceTRY(0);
      return;
    }
    (async () => {
      try {
        await loadCariBalanceFromEkstre(token, accountId);
      } catch {
        setCurrentBalanceTRY(0);
      }
    })();
  }, [token, accountId]);

  // derived: filtered products
  const filteredProducts = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p?.name || p?.ad || "").toLowerCase();
      const sku = (p?.sku || "").toLowerCase();
      const bc = (p?.barcode || p?.barkod || "").toLowerCase();
      return name.includes(q) || sku.includes(q) || bc.includes(q);
    });
  }, [query, products]);

  // derived: totals
  const totals = useMemo(() => {
    let ara = 0;
    let kdv = 0;
    let genel = 0;

    const lines = cart.map((it) => {
      const qty = safeNum(it.quantity, 1);
      const price = safeNum(it.unitPrice, 0);
      const vatRate = safeNum(it.vatRate, 20);

      const sub = price * qty;
      const vat = (sub * vatRate) / 100;
      const tot = sub + vat;

      ara += sub;
      kdv += vat;
      genel += tot;

      return { ...it, lineSub: sub, lineVat: vat, lineTotal: tot };
    });

    const genelTRY = currency === "TRY" ? genel : genel * safeNum(fxRate, 1);

    return { ara, kdv, genel, genelTRY, lines };
  }, [cart, currency, fxRate]);

  const afterBalanceTRY = useMemo(() => {
    // satış -> cari borçlanır, kısmi tahsilat düşer
    return safeNum(currentBalanceTRY, 0) + safeNum(totals?.genelTRY, 0) - safeNum(partialPaymentTRY, 0);
  }, [currentBalanceTRY, totals, partialPaymentTRY]);

  // cart ops
  const addToCart = (p) => {
    if (!p?._id) return;
    setErrMsg("");

    setCart((prev) => {
      const exists = prev.find((x) => x.productId === p._id);
      if (exists) {
        return prev.map((x) =>
          x.productId === p._id ? { ...x, quantity: safeNum(x.quantity, 1) + 1 } : x
        );
      }
      return [
        ...prev,
        {
          productId: p._id,
          name: p.name || p.ad || "",
          barcode: p.barcode || p.barkod || "",
          sku: p.sku || "",
          quantity: 1,
          unitPrice: safeNum(p.satisFiyati, 0),
          vatRate: safeNum(p.vatRate, 20),
        },
      ];
    });
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((x) => x.productId !== productId));

  const updateCartLine = (productId, patch) => {
    setCart((prev) => prev.map((x) => (x.productId === productId ? { ...x, ...patch } : x)));
  };

  const clearForm = () => {
    setCart([]);
    setQuery("");
    setBarcodeInput("");
    setPaymentType("acik");
    setPartialPaymentTRY(0);
    setNote("");
    if (barcodeRef.current) barcodeRef.current.focus();
    if (token) getNextSaleNo(token).catch(() => {});
  };

  const findProductByBarcode = (code) => {
    const c = (code || "").trim();
    if (!c) return null;
    return products.find((p) => (p?.barcode || p?.barkod || "") === c) || null;
  };

  const handleAddByBarcode = () => {
    const p = findProductByBarcode(barcodeInput);
    if (!p) {
      setErrMsg("Ürün bulunamadı");
      return;
    }
    addToCart(p);
    setBarcodeInput("");
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  // save
  const saveSale = async () => {
    if (!token) throw new Error("Token yok");
    if (!accountId) throw new Error("Cari seçiniz");
    if (!cart.length) throw new Error("Sepette ürün olmalı");

   const payload = {
  saleNo,
  accountId,
  date,
  currency,
  fxRate: safeNum(fxRate, 1),
  manualRate: !!manualRate,
  paymentType,
  partialPaymentTRY: safeNum(partialPaymentTRY, 0),
  note,

  // 🔥 ÜRÜN SATIRLARI (TOTAL DAHİL)
  items: cart.map((x) => {
    const qty = safeNum(x.quantity, 1);
    const price = safeNum(x.unitPrice, 0);
    const lineTotal = qty * price;

    return {
      productId: x.productId,
      name: x.name,
      barcode: x.barcode,
      sku: x.sku,
      quantity: qty,
      unitPrice: price,
      vatRate: safeNum(x.vatRate, 20),
      total: lineTotal, // ❗ ÇOK ÖNEMLİ
    };
  }),
};

// 🔥 GENEL TOPLAM (UPDATE İÇİN ŞART)
payload.totalTRY = payload.items.reduce(
  (sum, i) => sum + safeNum(i.total, 0),
  0
);


    // ✅ TEK KAYIT NOKTASI
    try {
  setErrMsg("");
  setSuccessMsg("");

  let saved;

if (isEdit) {
  saved = await fetch(`/api/sales/update?saleNo=${editSaleNo}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
});

} else {
  saved = await apiPost(
    "/api/satis/create",
    token,
    payload
  );
}


  setSuccessMsg("✅ Satış başarıyla kaydedildi");

  // sepeti temizle
  setCart([]);

  // cari bakiyeyi güncelle
  await loadCariBalanceFromEkstre(token, accountId);

  // yeni satış no
  if (saved?.saleNo) setSaleNo(saved.saleNo);

  return saved;
} catch (e) {
  setErrMsg(e.message || "Satış kaydedilemedi");
  throw e;
}


    // bakiye refresh
    await loadCariBalanceFromEkstre(token, accountId);

    // satış no dönerse güncelle
    const newNo = saved?.saleNo || saved?.satisNo || "";
    if (newNo) setSaleNo(newNo);

    return saved;
  };

  const handleSave = async (withPdf) => {
    try {
      setSaving(true);
      setErrMsg("");

      const saved = await saveSale();

      if (withPdf) {
        const selectedCari = cariler.find((c) => c._id === accountId);
        const metaRows = [
          `Tarih: ${date}`,
          `Cari: ${cariDisplayName(selectedCari)}`,
          `Satış No: ${saved?.saleNo || saleNo || "-"}`,
          `Para Birimi: ${currency} | Kur: ${currency === "TRY" ? "1" : String(fxRate)}`,
          `Ödeme: ${paymentType} | Kısmi Tahsilat (TRY): ${fmt(partialPaymentTRY)}`,
          note ? `Not: ${note}` : "",
        ].filter(Boolean);

        const doc = await buildSalePdf({
          title: "Satış (Taslak)",
          metaRows,
          items: totals.lines,
          totals,
          currency,
        });

        doc.save(`satis-${saved?.saleNo || saleNo || "taslak"}.pdf`);
      }

      clearForm();
    } catch (e) {
      setErrMsg(e?.message || "Satış kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  // UI
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-lg font-semibold">Ürün Satış</h1>
          <p className="text-sm text-gray-500">ERP / Ortak Stok</p>
        </div>

        <div className="text-sm text-gray-600">
          <span className="mr-2">Satış No:</span>
          <span className="font-semibold">{saleNo || "-"}</span>
        </div>
      </div>

      {errMsg ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errMsg}
        </div>
      ) : null}
      
      {successMsg ? (
  <div className="alert alert-success py-2">{successMsg}</div>
) : null}


      {/* ÜST FORM */}
      <div className="mb-4 rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-600">Cari</label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Cari seç</option>
              {cariler.map((c) => (
                <option key={c._id} value={c._id}>
                  {cariDisplayName(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Tarih</label>
            <input
              type="date"
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Para</label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Ödeme</label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="acik">Açık Hesap</option>
              <option value="nakit">Nakit</option>
              <option value="kart">Kart</option>
              <option value="havale">Havale</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Kısmi Tahsilat (TRY)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="h-10 w-full rounded-md border px-3 text-sm text-right outline-none focus:ring-2 focus:ring-blue-200"
              value={partialPaymentTRY}
              onChange={(e) => setPartialPaymentTRY(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="md:col-span-6">
            <label className="mb-1 block text-xs text-gray-600">Not</label>
            <input
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Not"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-gray-600">Kur</label>
            <input
              type="number"
              step="0.0001"
              className="h-10 w-full rounded-md border px-3 text-sm text-right outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              disabled={currency === "TRY"}
              placeholder="1"
            />
          </div>

          <div className="md:col-span-3 flex items-end gap-2">
            <input
              id="manualRate"
              type="checkbox"
              className="h-4 w-4"
              checked={manualRate}
              onChange={(e) => setManualRate(e.target.checked)}
              disabled={currency === "TRY"}
            />
            <label htmlFor="manualRate" className="text-sm text-gray-700">
              Manuel Kur
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Mevcut Cari Bakiye (TRY)</div>
            <div className="text-sm font-semibold">{fmt(currentBalanceTRY)} TRY</div>
          </div>
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Bu Satış (TRY)</div>
            <div className="text-sm font-semibold">{fmt(totals.genelTRY)} TRY</div>
          </div>
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Satış Sonrası Bakiye (TRY)</div>
            <div className="text-sm font-semibold">{fmt(afterBalanceTRY)} TRY</div>
          </div>
        </div>
      </div>

      {/* ÜRÜN EKLE */}
      <div className="mb-4 rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1 block text-xs text-gray-600">Ürün ara (ad / sku / barkod)</label>
            <input
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün ara (ad / sku / barkod)"
            />
            <div className="mt-1 text-xs text-gray-500">{products.length} ürün (stok &gt; 0)</div>
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-600">Barkod okut (Enter)</label>
            <input
              ref={barcodeRef}
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Barkod okut (Enter)"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddByBarcode();
              }}
            />
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              type="button"
              className="h-10 w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={handleAddByBarcode}
              disabled={!barcodeInput.trim()}
            >
              + Barkoddan Ekle
            </button>
          </div>
        </div>

        {query ? (
          <div className="mt-3 max-h-56 overflow-auto rounded-md border">
            {filteredProducts.length ? (
              filteredProducts.slice(0, 50).map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name || p.ad}</div>
                    <div className="text-xs text-gray-500">
                      Barkod: {p.barcode || p.barkod || "-"} • SKU: {p.sku || "-"} • Stok:{" "}
                      {safeNum(p.stock, 0)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={() => addToCart(p)}
                  >
                    Ekle
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-gray-500">Ürün bulunamadı</div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-500">Aramak için yukarıya ürün adı / sku / barkod yaz.</div>
        )}
      </div>

      {/* SEPET */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Sepet</h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              disabled={!cart.length || saving}
              onClick={() => handleSave(true)}
            >
              Satışı Kaydet + PDF
            </button>

            <button
              type="button"
              className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              disabled={!cart.length || !accountId || saving}
              onClick={() => handleSave(false)}
            >
              Satışı Kaydet
            </button>

            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              disabled={saving}
              onClick={clearForm}
            >
              Temizle
            </button>
          </div>
        </div>

        <div className="overflow-auto rounded-md border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Ürün</th>
                <th className="px-3 py-2 text-left">Barkod</th>
                <th className="px-3 py-2 text-right">Adet</th>
                <th className="px-3 py-2 text-right">Birim</th>
                <th className="px-3 py-2 text-right">KDV %</th>
                <th className="px-3 py-2 text-right">Toplam</th>
                <th className="px-3 py-2 text-center">Sil</th>
              </tr>
            </thead>

            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    Sepet boş
                  </td>
                </tr>
              ) : (
                totals.lines.map((r) => (
                  <tr key={r.productId} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      {r.sku ? <div className="text-xs text-gray-500">SKU: {r.sku}</div> : null}
                    </td>

                    <td className="px-3 py-2 text-gray-700">{r.barcode || "-"}</td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="1"
                        className="h-9 w-24 rounded-md border px-2 text-right outline-none focus:ring-2 focus:ring-blue-200"
                        value={safeNum(r.quantity, 1)}
                        onChange={(e) => updateCartLine(r.productId, { quantity: safeNum(e.target.value, 1) })}
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-9 w-28 rounded-md border px-2 text-right outline-none focus:ring-2 focus:ring-blue-200"
                        value={safeNum(r.unitPrice, 0)}
                        onChange={(e) => updateCartLine(r.productId, { unitPrice: safeNum(e.target.value, 0) })}
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="h-9 w-20 rounded-md border px-2 text-right outline-none focus:ring-2 focus:ring-blue-200"
                        value={safeNum(r.vatRate, 20)}
                        onChange={(e) => updateCartLine(r.productId, { vatRate: safeNum(e.target.value, 20) })}
                      />
                    </td>

                    <td className="px-3 py-2 text-right font-semibold">
                      {fmt(r.lineTotal)} {currency}
                    </td>

                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => removeFromCart(r.productId)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Ara Toplam</div>
            <div className="text-sm font-semibold">
              {fmt(totals.ara)} {currency}
            </div>
          </div>
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">KDV</div>
            <div className="text-sm font-semibold">
              {fmt(totals.kdv)} {currency}
            </div>
          </div>
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Genel Toplam</div>
            <div className="text-sm font-semibold">
              {fmt(totals.genel)} {currency}
            </div>
          </div>
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">TRY</div>
            <div className="text-sm font-semibold">{fmt(totals.genelTRY)} TRY</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Not: Kısmi Tahsilat (TRY) alanı, satış sonrası otomatik tahsilat için backend’de satış kaydıyla birlikte işlenir.
        </div>
      </div>
    </div>
  );
}
