"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";

// ===================== HELPERS =====================
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function safeFilename(name) {
  // Header'larda Türkçe/özel karakter sorununu çözer
  const s = safeStr(name)
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return s || "dokuman";
}

/**
 * ✅ PDF (Yatay A4) + AutoTable
 * Kurulum: npm i jspdf jspdf-autotable
 */
async function loadPdfLibs() {
  const jsPDFMod = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const jsPDF = jsPDFMod.jsPDF;
  const autoTable = autoTableMod.default || autoTableMod;
  return { jsPDF, autoTable };
}

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 });

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GET ${url} ${res.status} ${t}`);
  }
  return res.json();
}

async function apiPost(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`POST ${url} ${res.status} ${t}`);
  }
  return res.json();
}

export default function UrunSatisPage() {
  const [token, setToken] = useState("");

  // ================= DATA =================
  const [cariler, setCariler] = useState([]);
  const [products, setProducts] = useState([]);

  // ================= FORM =================
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [currency, setCurrency] = useState("TRY");
  const [fxRate, setFxRate] = useState(1);
  const [manualRate, setManualRate] = useState(false);

  const [paymentType, setPaymentType] = useState("Açık Hesap");
  const [partialPaymentTry, setPartialPaymentTry] = useState(0);
  const [note, setNote] = useState("");

  // cari bakiye gösterimi
  const [cariBakiyeTry, setCariBakiyeTry] = useState(0);

  // satış no
  const [saleNo, setSaleNo] = useState("");

  // barkod / ürün arama
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");

  // sepet
  const [cart, setCart] = useState([]);

  // ui
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // ================= LOADERS =================
  async function loadCariler(t) {
    const d = await apiGet("/api/cari", t);
    const list = Array.isArray(d) ? d : d?.cariler || d?.accounts || d?.data || [];
    setCariler(Array.isArray(list) ? list : []);
  }

  // =====================
// ÜRÜNLERİ YÜKLE (SATIŞ)
// =====================
async function loadProducts(t) {
  if (!t) throw new Error("Token yok");

  const res = await fetch("/api/products/list", {
    headers: {
      Authorization: `Bearer ${t}`,
    },
  });

  if (!res.ok) {
    throw new Error("Ürünler alınamadı");
  }

  const d = await res.json();

  /**
   * /api/products/list dönüşleri:
   * - array
   * - { products: [] }
   * - { data: [] }
   */
  const listRaw = Array.isArray(d)
    ? d
    : d?.products || d?.data || d?.items || [];

  const list = Array.isArray(listRaw) ? listRaw : [];

  // =====================
  // NORMALIZE
  // =====================
  const normalized = list.map((p) => {
    const stock = Number(p?.stock ?? p?.stok ?? 0);
    const price = Number(
      p?.satisFiyati ??
      p?.priceTl ??
      p?.price ??
      0
    );

    return {
      ...p,

      // ID
      _id: p?._id || p?.id,

      // İsim
      name: p?.name ?? p?.ad ?? "",
      ad: p?.ad ?? p?.name ?? "",

      // Barkod / SKU
      barcode: p?.barcode ?? p?.barkod ?? "",
      barkod: p?.barkod ?? p?.barcode ?? "",
      sku: p?.sku ?? p?.stokKodu ?? "",

      // Stok
      stock,
      stok: stock,

      // Fiyat / KDV
      satisFiyati: price,
      vatRate: Number(p?.vatRate ?? p?.kdv ?? 20),
    };
  });

  // =====================
  // SATIŞ EKRANI FİLTRESİ
  // =====================
  const filtered = normalized.filter((p) => p.stock > 0);

  setProducts(filtered);
}

  async function loadCariBakiye(t, aId) {
    if (!t || !aId) return;

    // 1) hızlı endpoint dene (token'lı)
    const urls = [
      `/api/cari/balance?id=${encodeURIComponent(aId)}`,
      `/api/cari/balance?accountId=${encodeURIComponent(aId)}`,
      `/api/accounts/balance?accountId=${encodeURIComponent(aId)}`,
    ];

    for (const url of urls) {
      try {
        const d = await apiGet(url, t);

        const val =
          d?.balanceTry ??
          d?.bakiyeTry ??
          d?.balance ??
          d?.bakiye ??
          d?.data?.balanceTry ??
          d?.data?.bakiyeTry ??
          d?.data?.balance ??
          d?.data?.bakiye;

        const n = safeNum(val, NaN);
        if (Number.isFinite(n)) {
          setCariBakiyeTry(n);
          return;
        }
      } catch (e) {
        // devam
      }
    }

    // 2) fallback: ekstre üzerinden hesapla
    try {
      const start = "2000-01-01";
      const end = todayISO();
      const d = await apiGet(
        `/api/cari/ekstre?accountId=${encodeURIComponent(aId)}&start=${start}&end=${end}`,
        t
      );

      const val = d?.balance ?? d?.bakiye ?? d?.data?.balance ?? d?.data?.bakiye;
      const n = safeNum(val, NaN);
      if (Number.isFinite(n)) {
        setCariBakiyeTry(n);
        return;
      }

      const rows = d?.rows || d?.items || d?.transactions || d?.data || [];
      if (Array.isArray(rows) && rows.length) {
        const last = rows[rows.length - 1];
        setCariBakiyeTry(safeNum(last?.balance ?? last?.bakiye, 0));
        return;
      }
    } catch (e) {}

    setCariBakiyeTry(0);
  }

  async function getNextSaleNo(t) {
    try {
      const d = await apiGet("/api/cari/next-sale-no", t);
      setSaleNo(d?.saleNo || d?.nextSaleNo || "");
    } catch (e) {
      // sessiz
    }
  }

  // ================= INIT =================
  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);

    if (t) {
      (async () => {
        try {
          setErrMsg("");
          await loadCariler(t);
         useEffect(() => {
  const t = getToken();
  setToken(t);
  if (!t) return;

  loadCariler(t);
  loadUrunler(t);
}, []);

          await getNextSaleNo(t);
        } catch (e) {
          setErrMsg(e?.message || "Veriler yüklenemedi");
        }
      })();
    }
  }, []);
  // cari seçilince bakiye yenile
  useEffect(() => {
    if (token && accountId) {
      loadCariBakiye(token, accountId);
    }
  }, [token, accountId]);

  // ================= SEPET HESAPLARI =================
  const totals = useMemo(() => {
    const araToplam = cart.reduce((sum, r) => sum + safeNum(r?.lineNet, 0), 0);
    const kdvToplam = cart.reduce((sum, r) => sum + safeNum(r?.lineVat, 0), 0);
    const genelToplam = cart.reduce((sum, r) => sum + safeNum(r?.lineGross, 0), 0);

    // dövizli satışlarda TRY karşılığı (fxRate)
    const tryToplam = currency === "TRY" ? genelToplam : genelToplam * safeNum(fxRate, 1);

    return { araToplam, kdvToplam, genelToplam, tryToplam };
  }, [cart, currency, fxRate]);

  const satisSonrasiBakiyeTry = useMemo(() => {
    // satış borç yazar: bakiye + toplam
    return safeNum(cariBakiyeTry, 0) + safeNum(totals.tryToplam, 0) - safeNum(partialPaymentTry, 0);
  }, [cariBakiyeTry, totals.tryToplam, partialPaymentTry]);

  // ================= ÜRÜN BUL / EKLE =================
  const findProduct = (q) => {
    const s = safeStr(q).toLowerCase();
    if (!s) return null;
    return products.find((p) => {
      const name = safeStr(p?.name || p?.ad).toLowerCase();
      const sku = safeStr(p?.sku).toLowerCase();
      const bc = safeStr(p?.barcode || p?.barkod).toLowerCase();
      return name.includes(s) || sku.includes(s) || bc === s;
    });
  };

  const addToCart = (product) => {
    if (!product?._id) return;

    const vat = safeNum(product?.vatRate, 20);
    const unit = safeNum(product?.satisFiyati, 0);

    const qty = 1;
    const net = unit * qty;
    const vatAmt = net * (vat / 100);
    const gross = net + vatAmt;

    setCart((prev) => [
      ...prev,
      {
        productId: product._id,
        name: product.name || product.ad || "",
        barcode: product.barcode || product.barkod || "",
        qty,
        unitPrice: unit,
        vatRate: vat,
        lineNet: net,
        lineVat: vatAmt,
        lineGross: gross,
      },
    ]);
  };

  const onAddFirst = () => {
    const p = findProduct(query || barcode);
    if (!p) {
      setErrMsg("Ürün bulunamadı");
      return;
    }
    setErrMsg("");
    addToCart(p);
    setQuery("");
    setBarcode("");
  };

  const updateCartRow = (idx, patch) => {
    setCart((prev) => {
      const next = [...prev];
      const row = { ...next[idx], ...patch };

      const qty = safeNum(row.qty, 1);
      const unit = safeNum(row.unitPrice, 0);
      const vat = safeNum(row.vatRate, 20);

      const net = unit * qty;
      const vatAmt = net * (vat / 100);
      const gross = net + vatAmt;

      row.qty = qty;
      row.unitPrice = unit;
      row.vatRate = vat;
      row.lineNet = net;
      row.lineVat = vatAmt;
      row.lineGross = gross;

      next[idx] = row;
      return next;
    });
  };

  const removeRow = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    setCart([]);
    setQuery("");
    setBarcode("");
    setPartialPaymentTry(0);
    setNote("");
    setErrMsg("");
  };

  // ================= PDF (TASLAK) =================
  const buildDraftPdf = async () => {
    if (!cart.length) {
      setErrMsg("PDF için sepette ürün olmalı");
      return;
    }
    setErrMsg("");

    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    doc.setFontSize(14);
    doc.text("Satış Fişi (Taslak)", 40, 40);

    doc.setFontSize(10);
    doc.text(`Tarih: ${date}`, 40, 60);
    doc.text(`Cari: ${safeStr(cariler.find((c) => c._id === accountId)?.name || "")}`, 40, 75);
    doc.text(`Para Birimi: ${currency}`, 40, 90);
    doc.text(`Kur: ${fmt(fxRate)}`, 40, 105);

    autoTable(doc, {
      startY: 130,
      head: [["Ürün", "Barkod", "Adet", "Birim", "KDV %", "Toplam"]],
      body: cart.map((r) => [
        r.name,
        r.barcode,
        String(r.qty),
        fmt(r.unitPrice),
        String(r.vatRate),
        fmt(r.lineGross),
      ]),
      styles: { fontSize: 9 },
    });

    const y = doc.lastAutoTable?.finalY || 130;
    doc.setFontSize(10);
    doc.text(`Ara Toplam: ${fmt(totals.araToplam)} ${currency}`, 40, y + 30);
    doc.text(`KDV: ${fmt(totals.kdvToplam)} ${currency}`, 40, y + 45);
    doc.text(`Genel Toplam: ${fmt(totals.genelToplam)} ${currency}`, 40, y + 60);
    doc.text(`TRY Karşılığı: ${fmt(totals.tryToplam)} TRY`, 40, y + 75);

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
  // ================= SATIŞ KAYDET =================
  const saveSale = async () => {
    if (!accountId) {
      setErrMsg("Cari seçiniz");
      return;
    }
    if (!cart.length) {
      setErrMsg("Sepet boş");
      return;
    }

    setLoading(true);
    setErrMsg("");

    try {
      const payload = {
        accountId,
        date,
        currency,
        fxRate: safeNum(fxRate, 1),
        manualRate: !!manualRate,
        saleNo,
        paymentType,
        partialPaymentTry: safeNum(partialPaymentTry, 0),
        note: safeStr(note),
        items: cart.map((r) => ({
          productId: r.productId,
          qty: safeNum(r.qty, 1),
          unitPrice: safeNum(r.unitPrice, 0),
          vatRate: safeNum(r.vatRate, 20),
          lineNet: safeNum(r.lineNet, 0),
          lineVat: safeNum(r.lineVat, 0),
          lineGross: safeNum(r.lineGross, 0),
        })),
        totals: {
          araToplam: safeNum(totals.araToplam, 0),
          kdvToplam: safeNum(totals.kdvToplam, 0),
          genelToplam: safeNum(totals.genelToplam, 0),
          tryToplam: safeNum(totals.tryToplam, 0),
        },
        source: "erp", // pazaryeri satışları da buradan geleceği için ayırıcı
      };

      // ✅ tek noktadan satış: varsa /api/satis/create tercih edilir
      let saved = null;
      try {
        saved = await apiPost("/api/satis/create", token, payload);
      } catch (e) {
        // fallback eski akış
      }

      if (!saved) {
        // 1) cari hareket (sale)
        await apiPost("/api/cari/transactions", token, {
          accountId,
          type: "sale",
          totalTRY: safeNum(totals.tryToplam, 0),
          currency,
          fxRate: safeNum(fxRate, 1),
          note: safeStr(note),
          source: "system",
          saleNo,
        });

        // 2) stok düş
        for (const r of cart) {
          await apiPost("/api/urunler/update-stock", token, {
            productId: r.productId,
            delta: -safeNum(r.qty, 1),
            reason: "sale",
            ref: saleNo || "",
          });
        }

        // 3) kısmi tahsilat
        if (safeNum(partialPaymentTry, 0) > 0) {
          await apiPost("/api/cari/transactions", token, {
            accountId,
            type: "payment",
            totalTRY: safeNum(partialPaymentTry, 0),
            currency: "TRY",
            fxRate: 1,
            note: "Kısmi Tahsilat (Satış)",
            source: "system",
            saleNo,
          });
        }
      }

      // satış no yenile
      await getNextSaleNo(token);

      // cari bakiye yenile
      await loadCariBakiye(token, accountId);

      // ürünleri yenile (stok>0 filtre var)
      await loadProducts(token);

      // PDF aç
      await buildDraftPdf();

      clearAll();
    } catch (e) {
      setErrMsg(e?.message || "Satış kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  const selectedCari = useMemo(
    () => cariler.find((c) => c._id === accountId) || null,
    [cariler, accountId]
  );

  return (
    <RequireAuth>
      <div className="p-4">
        <div className="text-xl font-semibold mb-3">Ürün Satış</div>

        {errMsg ? (
          <div className="mb-3 p-2 border border-red-300 bg-red-50 text-red-700 rounded">
            {errMsg}
          </div>
        ) : null}

        <div className="bg-white rounded border p-3 mb-3">
          <div className="grid grid-cols-6 gap-2">
            {/* Cari */}
            <select
              className="border rounded p-2 col-span-2"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Cari Seç</option>
              {cariler.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name || c.unvan || c.title || c._id}
                </option>
              ))}
            </select>

            {/* Tarih */}
            <input
              type="date"
              className="border rounded p-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {/* Para birimi */}
            <select
              className="border rounded p-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

            {/* Ödeme tipi */}
            <select
              className="border rounded p-2"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="Açık Hesap">Açık Hesap</option>
              <option value="Kısmi Tahsilat">Kısmi Tahsilat</option>
              <option value="Tam Tahsilat">Tam Tahsilat</option>
            </select>

            {/* Kısmi tahsilat */}
            <input
              type="number"
              className="border rounded p-2"
              value={partialPaymentTry}
              onChange={(e) => setPartialPaymentTry(safeNum(e.target.value, 0))}
              placeholder="0"
            />

            {/* Not */}
            <input
              className="border rounded p-2 col-span-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Not"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-700">
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">Mevcut Cari Bakiye (TRY)</div>
              <div className="font-semibold">{fmt(cariBakiyeTry)} TRY</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">Bu Satış (TRY)</div>
              <div className="font-semibold">{fmt(totals.tryToplam)} TRY</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">Satış Sonrası Bakiye (TRY)</div>
              <div className="font-semibold">{fmt(satisSonrasiBakiyeTry)} TRY</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded border p-3 mb-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              className="border rounded p-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün ara (ad / sku / barkod)"
            />
            <input
              className="border rounded p-2"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barkod"
            />
            <button
              className="bg-blue-600 text-white rounded p-2"
              onClick={onAddFirst}
              type="button"
            >
              + İlk Ürünü Ekle
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {products?.length ? `${products.length} ürün (stok > 0)` : "Ürün bulunamadı"}
          </div>
        </div>

        <div className="bg-white rounded border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Sepet</div>
            <div className="flex gap-2">
              <button
                className="border rounded px-3 py-2"
                onClick={buildDraftPdf}
                type="button"
              >
                PDF (Taslak)
              </button>
              <button
                className="bg-green-600 text-white rounded px-3 py-2"
                disabled={loading}
                onClick={saveSale}
                type="button"
              >
                {loading ? "Kaydediliyor..." : "Satışı Kaydet + PDF"}
              </button>
              <button className="border rounded px-3 py-2" onClick={clearAll} type="button">
                Temizle
              </button>
            </div>
          </div>

          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Ürün</th>
                  <th className="p-2 text-left">Barkod</th>
                  <th className="p-2 text-right">Adet</th>
                  <th className="p-2 text-right">Birim</th>
                  <th className="p-2 text-right">KDV %</th>
                  <th className="p-2 text-right">Toplam</th>
                  <th className="p-2 text-right">Sil</th>
                </tr>
              </thead>
              <tbody>
                {!cart.length ? (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={7}>
                      Sepet boş
                    </td>
                  </tr>
                ) : (
                  cart.map((r, idx) => (
                    <tr key={`${r.productId}-${idx}`} className="border-t">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.barcode}</td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          className="border rounded p-1 w-20 text-right"
                          value={r.qty}
                          onChange={(e) => updateCartRow(idx, { qty: safeNum(e.target.value, 1) })}
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          className="border rounded p-1 w-28 text-right"
                          value={r.unitPrice}
                          onChange={(e) =>
                            updateCartRow(idx, { unitPrice: safeNum(e.target.value, 0) })
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          className="border rounded p-1 w-20 text-right"
                          value={r.vatRate}
                          onChange={(e) => updateCartRow(idx, { vatRate: safeNum(e.target.value, 20) })}
                        />
                      </td>
                      <td className="p-2 text-right">{fmt(r.lineGross)} {currency}</td>
                      <td className="p-2 text-right">
                        <button
                          className="text-red-600"
                          onClick={() => removeRow(idx)}
                          type="button"
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

          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">Ara Toplam</div>
              <div className="font-semibold">{fmt(totals.araToplam)} {currency}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">KDV</div>
              <div className="font-semibold">{fmt(totals.kdvToplam)} {currency}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">Genel Toplam</div>
              <div className="font-semibold">{fmt(totals.genelToplam)} {currency}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-gray-500">TRY</div>
              <div className="font-semibold">{fmt(totals.tryToplam)} TRY</div>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Not: Kısmi Tahsilat (TRY) alanı, satış sonrası otomatik tahsilat için backend’de satış kaydıyla birlikte işlenir.
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
