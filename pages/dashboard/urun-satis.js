// 📄 /pages/dashboard/urun-satis.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import RequireAuth from "@/components/RequireAuth";

/**
 * PDF (Yatay A4) + AutoTable
 * Kurulum: npm i jspdf jspdf-autotable
 */
async function loadPdfLibs() {
  const jsPDFMod = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const jsPDF = jsPDFMod.jsPDF;
  const autoTable = autoTableMod.default || autoTableMod;
  return { jsPDF, autoTable };
}

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 4 });

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `GET ${url} hata`);
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `POST ${url} hata`);
  return data;
}

export default function UrunSatisPage() {
  // ================= AUTH =================
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
  const [loadingRate, setLoadingRate] = useState(false);

  // ödeme şekli + kısmi tahsilat
  const [paymentType, setPaymentType] = useState("Açık Hesap"); // Açık Hesap | Nakit | Kredi Kartı | Havale/EFT
  const [tahsilatTry, setTahsilatTry] = useState(0);

  const [note, setNote] = useState("");

  // arama / barkod
  const [q, setQ] = useState("");
  const [barcode, setBarcode] = useState("");
  const barcodeRef = useRef(null);

  // sepet
  const [items, setItems] = useState([]); // {productId, name, sku, barcode, qty, unitPrice, vatRate, stock}

  // cari bakiye
  const [cariBakiyeTry, setCariBakiyeTry] = useState(0);

  // ui
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // ================= LOADERS =================
  async function loadCariler(t) {
    const tries = ["/api/cari", "/api/accounts"];
    let lastErr = null;

    for (const url of tries) {
      try {
        const d = await apiGet(url, t);
        const list = d?.accounts || d?.cariler || d?.data || d?.items || [];
        if (Array.isArray(list)) {
          setCariler(list);
          if (!accountId && list[0]?._id) setAccountId(String(list[0]._id));
          return;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Cariler alınamadı");
  }

  async function loadProducts(t) {
    const tries = ["/api/urunler", "/api/products"];
    let lastErr = null;

    for (const url of tries) {
      try {
        const d = await apiGet(url, t);
        const list = d?.products || d?.urunler || d?.data || d?.items || [];
        if (Array.isArray(list)) {
          // Satış ekranında sadece stok > 0 göster
          const filtered = list.filter((p) => Number(p?.stok ?? p?.stock ?? 0) > 0);
          setProducts(filtered);
          return;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Ürünler alınamadı");
  }

  async function loadCariBakiye(t, aId) {
    if (!aId) return;
    const urls = [
      `/api/cari/balance?accountId=${encodeURIComponent(aId)}`,
      `/api/cari/balance?id=${encodeURIComponent(aId)}`,
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
          d?.data?.bakiye ??
          0;
        setCariBakiyeTry(Number(val || 0));
        return;
      } catch (_) {}
    }
    setCariBakiyeTry(0);
  }

  async function fetchTcmbRate(t, cur) {
    if (!t || !cur || cur === "TRY") return;
    setLoadingRate(true);
    setErr("");

    const urls = [
      `/api/tcmb?currency=${encodeURIComponent(cur)}`,
      `/api/rates/tcmb?currency=${encodeURIComponent(cur)}`,
      `/api/cari/tcmb?currency=${encodeURIComponent(cur)}`,
    ];

    try {
      for (const url of urls) {
        try {
          const d = await apiGet(url, t);
          const rate =
            d?.rate ??
            d?.data?.rate ??
            d?.rates?.[cur] ??
            d?.data?.rates?.[cur] ??
            d?.rates?.[cur?.toUpperCase?.()] ??
            d?.data?.rates?.[cur?.toUpperCase?.()];

          if (rate) {
            setFxRate(Number(rate));
            setManualRate(false);
            return;
          }
        } catch (_) {}
      }
      throw new Error("TCMB kuru bulunamadı");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingRate(false);
    }
  }

  // ================= INIT =================
  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);
    if (!t) return;

    (async () => {
      try {
        setErr("");
        await Promise.all([loadCariler(t), loadProducts(t)]);
      } catch (e) {
        setErr(e.message);
      } finally {
        setTimeout(() => barcodeRef.current?.focus(), 250);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kur seçimi: TRY değilse (manuel değilse) TCMB çek
  useEffect(() => {
    if (!token) return;

    if (currency === "TRY") {
      setFxRate(1);
      setManualRate(false);
      return;
    }

    if (!manualRate) fetchTcmbRate(token, currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, token]);

  // Cari seçildiğinde bakiye getir
  useEffect(() => {
    if (token && accountId) loadCariBakiye(token, accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, accountId]);

  // ================= CART HELPERS =================
  const totals = useMemo(() => {
    const sub = items.reduce(
      (a, it) => a + Number(it.qty || 0) * Number(it.unitPrice || 0),
      0
    );
    const vat = items.reduce((a, it) => {
      const ara = Number(it.qty || 0) * Number(it.unitPrice || 0);
      return a + ara * (Number(it.vatRate || 0) / 100);
    }, 0);
    const total = sub + vat;

    const tryTotal = currency === "TRY" ? total : total * Number(fxRate || 0);

    return { sub, vat, total, tryTotal };
  }, [items, currency, fxRate]);

  // ödeme tipine göre varsayılan tahsilat (kısmi)
  useEffect(() => {
    if (paymentType === "Açık Hesap") setTahsilatTry(0);
    else setTahsilatTry(Number(totals.tryTotal || 0));
  }, [paymentType, totals.tryTotal]);

  const bakiyeSonrasi = useMemo(() => {
    const sale = Number(totals.tryTotal || 0);
    const tah = Number(tahsilatTry || 0);
    return Number(cariBakiyeTry || 0) + sale - tah;
  }, [cariBakiyeTry, totals.tryTotal, tahsilatTry]);

  function addToCart(p) {
    setErr("");
    setOk("");

    const productId = String(p?._id || p?.id || "");
    if (!productId) return;

    const name = p?.ad || p?.name || "";
    const sku = p?.sku || "";
    const br = p?.barkod || p?.barcode || "";
    const stock = Number(p?.stok ?? p?.stock ?? 0);
    const unitPrice = Number(p?.satisFiyati ?? p?.price ?? 0);
    const vatRate = Number(p?.kdv ?? p?.vatRate ?? 20);

    setItems((prev) => {
      const found = prev.find((x) => x.productId === productId);
      if (found) {
        if (Number(found.qty) + 1 > stock) {
          setErr("Stok yetersiz");
          return prev;
        }
        return prev.map((x) =>
          x.productId === productId ? { ...x, qty: Number(x.qty) + 1 } : x
        );
      }
      if (stock <= 0) {
        setErr("Stok yetersiz");
        return prev;
      }
      return [
        ...prev,
        { productId, name, sku, barcode: br, qty: 1, unitPrice, vatRate, stock },
      ];
    });
  }

  function removeFromCart(productId) {
    setItems((prev) => prev.filter((x) => x.productId !== productId));
  }

  function updateItem(productId, patch) {
    setItems((prev) =>
      prev.map((x) => {
        if (x.productId !== productId) return x;
        const next = { ...x, ...patch };
        const maxStock = Number(next.stock || 0);
        if (Number(next.qty || 0) > maxStock) next.qty = maxStock;
        return next;
      })
    );
  }

  function handleBarcodeEnter(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const code = String(barcode || "").trim();
    if (!code) return;

    const p = products.find(
      (x) => String(x?.barkod || x?.barcode || "") === code
    );
    if (!p) return setErr("Barkod bulunamadı");

    addToCart(p);
    setBarcode("");
  }

  const filteredProducts = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return products.slice(0, 20);

    const match = (p) => {
      const name = String(p?.ad || p?.name || "").toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      const br = String(p?.barkod || p?.barcode || "").toLowerCase();
      return name.includes(s) || sku.includes(s) || br.includes(s);
    };
    return products.filter(match).slice(0, 50);
  }, [products, q]);

  // ================= SAVE =================
  async function saveSale({ alsoPdf } = {}) {
    setErr("");
    setOk("");

    if (!accountId) return setErr("Cari seçmelisin");
    if (!items.length) return setErr("Sepette ürün olmalı");

    const saleTry = Number(totals.tryTotal || 0);
    const tah = Number(tahsilatTry || 0);
    if (tah < 0) return setErr("Tahsilat 0'dan küçük olamaz");
    if (tah > saleTry) return setErr("Tahsilat satış toplamından büyük olamaz");

    setSaving(true);
    try {
      const payload = {
        type: "sale",
        date,
        accountId,
        currency,
        fxRate: Number(fxRate || 1),
        paymentType,
        note,
        items: items.map((it) => ({
          productId: it.productId,
          name: it.name,
          qty: Number(it.qty || 0),
          unitPrice: Number(it.unitPrice || 0),
          vatRate: Number(it.vatRate || 0),
        })),
        tahsilatTry: tah, // ✅ Kısmi tahsilat (TRY)
      };

      const d = await apiPost("/api/cari/transactions", token, payload);
      const saleNo = d?.saleNo || d?.data?.saleNo || "";

      setOk(saleNo ? `Satış kaydedildi. Satış No: ${saleNo}` : "Satış kaydedildi.");

      if (alsoPdf) {
        await exportPdf({ saleNo });
      }

      setItems([]);
      await Promise.all([loadProducts(token), loadCariBakiye(token, accountId)]);
      setTimeout(() => barcodeRef.current?.focus(), 250);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ================= PDF =================
  async function exportPdf({ saleNo } = {}) {
    if (!items.length) return setErr("PDF için sepette ürün olmalı");

    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const cariName =
      cariler.find((c) => String(c._id) === String(accountId))?.ad || "";

    doc.setFontSize(16);
    doc.text("SATIŞ FİŞİ", 14, 14);

    doc.setFontSize(10);
    doc.text(`Tarih: ${date}`, 14, 22);
    doc.text(`Cari: ${cariName}`, 14, 28);
    doc.text(`Satış No: ${saleNo || "TASLAK"}`, 14, 34);

    const rightX = 235;
    doc.text(`Ara Toplam: ${fmt(totals.sub)} ${currency}`, rightX, 22);
    doc.text(`KDV: ${fmt(totals.vat)} ${currency}`, rightX, 28);
    doc.setFontSize(12);
    doc.text(`GENEL: ${fmt(totals.total)} ${currency}`, rightX, 36);
    doc.setFontSize(10);
    doc.text(`TRY: ${fmt(totals.tryTotal)} TRY`, rightX, 42);

    autoTable(doc, {
      startY: 50,
      head: [["Ürün", "Adet", "Birim", "KDV %", "KDV", "Toplam"]],
      body: items.map((it) => {
        const ara = Number(it.qty || 0) * Number(it.unitPrice || 0);
        const kdv = ara * (Number(it.vatRate || 0) / 100);
        return [
          it.name,
          String(it.qty),
          fmt(it.unitPrice),
          `%${it.vatRate}`,
          fmt(kdv),
          fmt(ara + kdv),
        ];
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 18, halign: "right" },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 18, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
      },
    });

    doc.save(`satis-${saleNo || "taslak"}.pdf`);
  }

  function clearAll() {
    setErr("");
    setOk("");
    setItems([]);
    setBarcode("");
    setQ("");
    setNote("");
    setPaymentType("Açık Hesap");
    setTahsilatTry(0);
    setCurrency("TRY");
    setFxRate(1);
    setManualRate(false);
    setTimeout(() => barcodeRef.current?.focus(), 250);
  }

  return (
    <RequireAuth>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Ürün Satış</h1>
          <div className="text-sm text-gray-500">ERP / Ortak Stok</div>
        </div>

        {err ? (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">
            {err}
          </div>
        ) : null}
        {ok ? (
          <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded">
            {ok}
          </div>
        ) : null}

        {/* ÜST PANEL */}
        <div className="bg-white p-3 rounded shadow space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <select
              className="border rounded px-2 py-2"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setErr("");
              }}
            >
              <option value="">Cari seç</option>
              {cariler.map((c) => (
                <option key={String(c._id)} value={String(c._id)}>
                  {c.ad || c.name || "-"}
                </option>
              ))}
            </select>

            <input
              className="border rounded px-2 py-2"
              value={date}
              type="date"
              onChange={(e) => setDate(e.target.value)}
            />

            <select
              className="border rounded px-2 py-2"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setManualRate(false);
              }}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

            <select
              className="border rounded px-2 py-2"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="Açık Hesap">Açık Hesap</option>
              <option value="Nakit">Nakit</option>
              <option value="Kredi Kartı">Kredi Kartı</option>
              <option value="Havale/EFT">Havale/EFT</option>
            </select>

            <input
              className="border rounded px-2 py-2"
              placeholder="Kısmi Tahsilat (TRY)"
              type="number"
              step="0.01"
              value={tahsilatTry}
              onChange={(e) => setTahsilatTry(Number(e.target.value))}
            />

            <input
              className="border rounded px-2 py-2"
              placeholder="Not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* ✅ Kur Paneli (TCMB + Manuel) — cari bakiye bloğunun hemen üstü */}
          {currency !== "TRY" && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Kur:</span>
                <input
                  type="number"
                  step="0.0001"
                  className="border px-2 py-1 rounded w-32"
                  value={fxRate}
                  onChange={(e) => {
                    setFxRate(Number(e.target.value));
                    setManualRate(true);
                  }}
                />
                <span className="text-xs text-gray-500">
                  {manualRate ? "Manuel" : "TCMB"}
                </span>
              </div>

              <button
                type="button"
                className="border px-3 py-1 rounded"
                onClick={() => fetchTcmbRate(token, currency)}
                disabled={loadingRate}
              >
                {loadingRate ? "Kur alınıyor..." : "TCMB’den Yenile"}
              </button>

              <div className="text-xs text-gray-500">
                TRY karşılığı: <b>{fmt(totals.tryTotal)} TRY</b>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div className="border rounded p-2">
              <div className="text-gray-500">Mevcut Cari Bakiye (TRY)</div>
              <div className="font-semibold">{fmt(cariBakiyeTry)} TRY</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-gray-500">Bu Satış (TRY)</div>
              <div className="font-semibold">{fmt(totals.tryTotal)} TRY</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-gray-500">Satış Sonrası Bakiye (TRY)</div>
              <div className="font-semibold">{fmt(bakiyeSonrasi)} TRY</div>
            </div>
          </div>
        </div>

        {/* ÜRÜN ARA + BARKOD */}
        <div className="bg-white p-3 rounded shadow space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="border rounded px-2 py-2"
              placeholder="Ürün ara (ad / sku / barkod)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <input
              ref={barcodeRef}
              className="border rounded px-2 py-2"
              placeholder="Barkod okut (Enter)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeEnter}
            />
            <button
              type="button"
              className="bg-blue-600 text-white rounded px-3 py-2"
              onClick={() => {
                const first = filteredProducts[0];
                if (first) addToCart(first);
              }}
            >
              + İlk Ürünü Ekle
            </button>
          </div>

          <div className="border rounded">
            {filteredProducts.map((p) => (
              <div
                key={String(p._id)}
                className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
              >
                <div className="text-sm">
                  <div className="font-medium">{p.ad || p.name}</div>
                  <div className="text-xs text-gray-500">
                    Stok: {p.stok ?? p.stock ?? 0}
                    {p.barkod || p.barcode ? ` • Barkod: ${p.barkod || p.barcode}` : ""}
                    {p.sku ? ` • SKU: ${p.sku}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="border rounded px-3 py-1"
                  onClick={() => addToCart(p)}
                >
                  Ekle
                </button>
              </div>
            ))}
            {!filteredProducts.length ? (
              <div className="p-3 text-sm text-gray-500">Ürün bulunamadı</div>
            ) : null}
          </div>
        </div>

        {/* SEPET */}
        <div className="bg-white p-3 rounded shadow space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Sepet</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="border rounded px-3 py-1"
                onClick={() => exportPdf({ saleNo: "TASLAK" })}
              >
                PDF (Taslak)
              </button>
              <button
                type="button"
                className="bg-green-600 text-white rounded px-3 py-1"
                disabled={saving}
                onClick={() => saveSale({ alsoPdf: true })}
              >
                {saving ? "Kaydediliyor..." : "Satışı Kaydet + PDF"}
              </button>
              <button
                type="button"
                className="border rounded px-3 py-1"
                onClick={clearAll}
                disabled={saving}
              >
                Temizle
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Ürün</th>
                  <th className="py-2 pr-2 w-28">Adet</th>
                  <th className="py-2 pr-2 w-36">Birim</th>
                  <th className="py-2 pr-2 w-24">KDV %</th>
                  <th className="py-2 pr-2 w-28">Toplam</th>
                  <th className="py-2 pr-2 w-20">Sil</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const ara = Number(it.qty || 0) * Number(it.unitPrice || 0);
                  const kdv = ara * (Number(it.vatRate || 0) / 100);
                  const toplam = ara + kdv;
                  return (
                    <tr key={it.productId} className="border-b last:border-b-0">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-gray-500">Stok: {it.stock}</div>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="border rounded px-2 py-1 w-24"
                          type="number"
                          min="1"
                          step="1"
                          value={it.qty}
                          onChange={(e) =>
                            updateItem(it.productId, { qty: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="border rounded px-2 py-1 w-32"
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItem(it.productId, { unitPrice: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="border rounded px-2 py-1 w-20"
                          type="number"
                          min="0"
                          step="1"
                          value={it.vatRate}
                          onChange={(e) =>
                            updateItem(it.productId, { vatRate: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {fmt(toplam)} {currency}
                      </td>
                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          className="border rounded px-3 py-1"
                          onClick={() => removeFromCart(it.productId)}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!items.length ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                      Sepet boş
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
            <div className="border rounded p-2">
              <div className="text-gray-500">Ara Toplam</div>
              <div className="font-semibold">
                {fmt(totals.sub)} {currency}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-gray-500">KDV</div>
              <div className="font-semibold">
                {fmt(totals.vat)} {currency}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-gray-500">Genel Toplam</div>
              <div className="font-semibold">
                {fmt(totals.total)} {currency}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-gray-500">TRY</div>
              <div className="font-semibold">{fmt(totals.tryTotal)} TRY</div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Not: <b>Kısmi Tahsilat (TRY)</b> alanı; satış sonrası otomatik tahsilat için backend’de satış kaydıyla birlikte işlenir.
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
