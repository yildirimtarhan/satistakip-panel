"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import RequireAuth from "@/components/RequireAuth";

function safeDecode(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function UrunAlis() {
  const [token, setToken] = useState("");

  const [role, setRole] = useState(null);
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);

  const [cariId, setCariId] = useState("");
  const [cariBakiye, setCariBakiye] = useState(null);
  const [loadingCariBakiye, setLoadingCariBakiye] = useState(false);

  const [rates, setRates] = useState({ TRY: 1, USD: 0, EUR: 0 });
  const [manualRates, setManualRates] = useState({ USD: "", EUR: "" });
  const [loadingRates, setLoadingRates] = useState(false);

  const [saving, setSaving] = useState(false);

  const [header, setHeader] = useState({
    tarih: "",
    belgeNo: "",
    siparisNo: "",
    aciklama: "",
  });

  const KDV_ORANLARI = [0, 1, 8, 10, 18, 20];
  const emptyRow = useMemo(
    () => ({
      productId: "",
      barkod: "",
      ad: "",
      adet: 1,
      fiyat: 0,
      kdv: 20,
      iskonto: 0,
      currency: "TRY",
      fxRate: 1,
    }),
    []
  );

  const [rows, setRows] = useState([{ ...emptyRow }]);

  // Token + role
  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);

    const decoded = t ? safeDecode(t) : null;
    setRole(decoded?.role || null);
  }, []);

  // Cariler
  const loadCariler = async (t) => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    setCariler(Array.isArray(data) ? data : data?.cariler || []);
  };

  // Ürünler
  const loadUrunler = async (t) => {
    const res = await fetch("/api/products/list", {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    // bazı projelerde {products: []} döner
    const list = Array.isArray(data) ? data : data?.products || [];
    setUrunler(list);
  };

  console.log("cariler örnek:", cariler?.[0]);

  // TCMB kurları
  const loadRates = async () => {
    try {
      setLoadingRates(true);
      const res = await fetch("/api/rates/tcmb");
      const data = await res.json();
      // beklenen: { TRY:1, USD:x, EUR:y } veya { usd, eur }
      const USD = Number(
  data?.USD?.rateSell || data?.USD?.rateBuy || data?.USD || data?.usd || 0
);

const EUR = Number(
  data?.EUR?.rateSell || data?.EUR?.rateBuy || data?.EUR || data?.eur || 0
);


      setRates({ TRY: 1, USD, EUR });
    } catch (e) {
      console.error("Kur çekme hatası:", e);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadCariler(token);
    loadUrunler(token);
    loadRates();
  }, [token]);

  // ✅✅✅ FIX: Cari seçilince bakiye getir (ekstre API'den hesaplanmış)
  useEffect(() => {
    if (!cariId || !token) {
      setCariBakiye(null);
      return;
    }

    setLoadingCariBakiye(true);

    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/cari/ekstre?accountId=${cariId}&start=1970-01-01&end=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const b = typeof data?.bakiye === "number" ? data.bakiye : 0;
        setCariBakiye(b);
      })
      .catch(() => setCariBakiye(0))
      .finally(() => setLoadingCariBakiye(false));
  }, [cariId, token]);

  const getFx = (currency) => {
    if (currency === "TRY") return 1;

    const m =
      currency === "USD"
        ? Number(manualRates.USD || 0)
        : Number(manualRates.EUR || 0);

    if (m && m > 0) return m;

    const r =
      currency === "USD"
        ? Number(rates.USD || 0)
        : Number(rates.EUR || 0);
    return r && r > 0 ? r : 1;
  };

  const lineTotalTRY = (r) => {
    const qty = Number(r.adet || 0);
    const price = Number(r.fiyat || 0);
    const kdv = Number(r.kdv ?? 20);
    const iskonto = Number(r.iskonto ?? 0);
    const fx = Number(r.fxRate || getFx(r.currency || "TRY"));
    const araToplam = qty * price;
    const netToplam = araToplam * (1 - iskonto / 100);
    const kdvliToplam = netToplam * (1 + kdv / 100);
    return kdvliToplam * fx;
  };

  const onCurrencyChange = (i, currency) => {
    const fx = getFx(currency);
    const copy = [...rows];
    copy[i] = { ...copy[i], currency, fxRate: fx };
    setRows(copy);
  };

  const toplamTRY = useMemo(() => {
    return rows.reduce((sum, r) => sum + lineTotalTRY(r), 0);
  }, [rows, rates, manualRates]);

  const updateHeader = (k, v) => setHeader((p) => ({ ...p, [k]: v }));

  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i] = { ...copy[i], [field]: value };
    setRows(copy);
  };

  const addRow = () => setRows((p) => [...p, { ...emptyRow }]);
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  const onSelectProduct = (i, productId) => {
  const p = urunler.find((x) => String(x._id || x.id) === String(productId));

  const copy = [...rows];

  if (!p) {
    copy[i] = { ...copy[i], productId: "" };
    setRows(copy);
    return;
  }

  copy[i] = {
    ...copy[i],
    productId: p._id || p.id,
    ad: p.ad || p.name || p.urunAdi || p.title || p.productName || "",
    barkod: p.barkod || p.barcode || "",
  };

  setRows(copy);
};

const onBarcodeBlur = (i) => {
  const b = String(rows[i]?.barkod || "").trim();
  if (!b) return;

  const p = urunler.find((x) => String(x.barkod || x.barcode || "") === b);

  if (p) {
    onSelectProduct(i, p._id || p.id);
  }
};

const handleSave = async () => {
  if (role === "admin") {
    alert("Admin alış işlemi yapamaz. Normal kullanıcı ile giriş yapın.");
    return;
  }

  if (!cariId) {
    alert("⚠️ Tedarikçi (Cari) seçin");
    return;
  }

  if (!token) {
    alert("⚠️ Giriş yapınız");
    return;
  }

  


    // Satırları normalize et
    const normalizedRows = rows
      .map((r) => ({
        ...r,
        adet: Number(r.adet || 0),
        fiyat: Number(r.fiyat || 0),
        kdv: Number(r.kdv ?? 18),
        iskonto: Number(r.iskonto ?? 0),
        barkod: String(r.barkod || "").trim(),
        ad: String(r.ad || "").trim(),
        currency: r.currency || "TRY",
      }))
      .filter((r) => (r.productId || r.ad || r.barkod) && r.adet > 0);

    if (normalizedRows.length === 0) {
      alert("⚠️ Alış kalemi yok");
      return;
    }

    try {
      setSaving(true);

      const items = [];

      for (let idx = 0; idx < normalizedRows.length; idx++) {
        const r = normalizedRows[idx];
        let productId = r.productId;

        // ✅ Barkod girildiyse otomatik ürün eşleştir
        if (!productId && r.barkod) {
          const found = urunler.find(
            (x) =>
              String(x.barkod || x.barcode || "").trim() ===
              String(r.barkod).trim()
          );
          if (found?._id) productId = found._id;
        }

        // Ürün seçilmemiş ama isim girilmişse ürün oluştur (MEVCUT DAVRANIŞI KORU)
        if (!productId && r.ad) {
          const resAdd = await fetch("/api/products/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: r.ad,
              ad: r.ad,
              barcode: r.barkod || "",
              barkod: r.barkod || "",
              priceTl: Number(r.fiyat || 0),
              satisFiyati: Number(r.fiyat || 0),
            }),
          });

          const created = await resAdd.json();
          productId = created?.product?._id || created?._id || "";
        }

        // 🔒 Stabilite: productId hala yoksa KAYDI DURDUR (sessiz continue yok)
        if (!productId) {
          alert(
            `⚠️ ${idx + 1}. satırda ürün eşleşmedi.\n` +
              `- Ürün seçin VEYA ürün adı girin.\n` +
              `- Barkod: ${r.barkod || "-"}`
          );
          return;
        }

        const fx = getFx(r.currency || "TRY");
        const kdv = Number(r.kdv ?? 20);
        const iskonto = Number(r.iskonto ?? 0);
        const araToplam = Number(r.adet) * Number(r.fiyat);
        const netToplam = araToplam * (1 - iskonto / 100);
        const kdvliDoviz = netToplam * (1 + kdv / 100);
        const totalFCY = kdvliDoviz;
        const totalTRY = kdvliDoviz * fx;

        items.push({
          productId,
          quantity: Number(r.adet),
          unitPrice: Number(r.fiyat),
          kdv,
          iskonto,
          currency: r.currency || "TRY",
          fxRate: fx,
          totalFCY,
          totalTRY,
          total: totalTRY,
        });

      }

      if (items.length === 0) {
        alert("⚠️ Alış kalemi yok");
        return;
      }

      // 🔥 TEK MERKEZ API – FINAL PAYLOAD
      const res = await fetch("/api/purchases/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: cariId,
          invoiceDate: header.tarih ? new Date(header.tarih).toISOString() : null,
          invoiceNo: header.belgeNo || "",
          orderNo: header.siparisNo || "",
          note: header.aciklama || "",
          items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Alış kaydedilemedi");
        return;
      }

      alert("✅ Ürün alışı başarıyla kaydedildi!");
      setRows([{ ...emptyRow }]);
      setHeader({ tarih: "", belgeNo: "", siparisNo: "", aciklama: "" });
      setCariId("");
    } catch (err) {
      console.error("Alış kaydetme hatası:", err);
      alert(err.message || "Alış kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireAuth>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Ürün Alış</h1>
          <div className="text-sm text-gray-600">
            Toplam (₺):{" "}
            <b>
              {Number(toplamTRY || 0).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}
            </b>
          </div>
        </div>

        {/* Admin uyarı */}
        {role === "admin" && (
          <div className="p-3 border rounded bg-yellow-50 text-sm">
            ⚠️ Admin ile alış yapılmaz. Normal kullanıcı ile giriş yapın.
          </div>
        )}

        {/* Üst Bilgi */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border rounded p-4">
          {/* ✅ Tedarikçi (Cari) + Cari Bakiye */}
          <div>
            <label className="text-sm text-gray-600">Tedarikçi (Cari)</label>
            <select
              value={cariId}
              onChange={(e) => setCariId(e.target.value)}
              className="w-full border rounded px-2 py-2"
            >
              <option value="">Seçiniz</option>
              {cariler.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.unvan ||
                    c.firmaAdi ||
                    c.ad ||
                    c.title ||
                    c.adSoyad ||
                    c.name ||
                    c.email ||
                    c._id}
                </option>
              ))}
            </select>

            {/* ✅ Cari Bakiye */}
            <div className="mt-2">
              <label className="text-sm text-gray-600">Cari Bakiye</label>
              <input
                readOnly
                value={
                  loadingCariBakiye
                    ? "Yükleniyor..."
                    : cariBakiye === null
                    ? "-"
                    : `${Number(cariBakiye || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY`
                }
                className="w-full border rounded px-2 py-2 bg-gray-100"
              />
            </div>
          </div>

          {/* ✅ Tarih */}
          <div>
            <label className="text-sm text-gray-600">Tarih</label>
            <input
              type="date"
              value={header.tarih}
              onChange={(e) => updateHeader("tarih", e.target.value)}
              className="w-full border rounded px-2 py-2"
            />
          </div>

          {/* ✅ Fatura No */}
          <div>
            <label className="text-sm text-gray-600">Fatura No</label>
            <input
              value={header.belgeNo}
              onChange={(e) => updateHeader("belgeNo", e.target.value)}
              className="w-full border rounded px-2 py-2"
              placeholder="Fatura No"
            />
          </div>

          {/* ✅ Sipariş No */}
          <div>
            <label className="text-sm text-gray-600">Sipariş No</label>
            <input
              value={header.siparisNo}
              onChange={(e) => updateHeader("siparisNo", e.target.value)}
              className="w-full border rounded px-2 py-2"
              placeholder="Sipariş No"
            />
          </div>

          {/* ✅ Açıklama */}
          <div className="md:col-span-4">
            <label className="text-sm text-gray-600">Açıklama</label>
            <input
              value={header.aciklama}
              onChange={(e) => updateHeader("aciklama", e.target.value)}
              className="w-full border rounded px-2 py-2"
              placeholder="Not / açıklama"
            />
          </div>
        </div>

        {/* Kur */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border rounded p-4">
          <div className="text-sm text-gray-700">
            <div className="font-semibold mb-1">TCMB Kur</div>
            <div>USD: {rates.USD ? rates.USD : "-"} </div>
            <div>EUR: {rates.EUR ? rates.EUR : "-"}</div>
            <button
              onClick={loadRates}
              disabled={loadingRates}
              className="mt-2 px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-60"
            >
              {loadingRates ? "Yükleniyor..." : "Kurları Yenile"}
            </button>
          </div>

          <div>
            <label className="text-sm text-gray-600">Manuel USD</label>
            <input
              value={manualRates.USD}
              onChange={(e) =>
                setManualRates((p) => ({ ...p, USD: e.target.value }))
              }
              className="w-full border rounded px-2 py-2"
              placeholder="Boşsa TCMB"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Manuel EUR</label>
            <input
              value={manualRates.EUR}
              onChange={(e) =>
                setManualRates((p) => ({ ...p, EUR: e.target.value }))
              }
              className="w-full border rounded px-2 py-2"
              placeholder="Boşsa TCMB"
            />
          </div>

          <div className="text-sm text-gray-600">
            <div className="font-semibold mb-1">Not</div>
            <div>
              Satır toplamları TRY hesaplanır:
              <br />
              <span className="text-gray-500">
                total = adet × fiyat × fxRate
              </span>
            </div>
          </div>
        </div>

        {/* Satırlar */}
        <div className="border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Alış Kalemleri</div>
            <button
              onClick={addRow}
              className="px-3 py-2 border rounded hover:bg-gray-50"
            >
              + Satır Ekle
            </button>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Ürün</th>
                  <th className="border px-2 py-1">Barkod</th>
                  <th className="border px-2 py-1 text-right">Adet</th>
                  <th className="border px-2 py-1 text-right">Fiyat</th>
                  <th className="border px-2 py-1 text-right">KDV %</th>
                  <th className="border px-2 py-1 text-right">İsk. %</th>
                  <th className="border px-2 py-1">Para</th>
                  <th className="border px-2 py-1 text-right">Kur</th>
                  <th className="border px-2 py-1 text-right">Toplam ₺</th>
                  <th className="border px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const fx = getFx(r.currency || "TRY");
                  const totalTry = lineTotalTRY(r);
                  return (
                    <tr key={i}>
                      <td className="border px-2 py-1 min-w-[240px]">
                        <select
                          value={r.productId}
                          onChange={(e) => onSelectProduct(i, e.target.value)}
                          className="w-full border rounded px-2 py-1"
                        >
                          <option value="">(Seç / Yoksa isim gir)</option>
                          {urunler.map((u) => (
  <option key={u._id || u.id} value={u._id || u.id}>

    {(u.ad || u.name || u.urunAdi || u.title || u.productName || "-") +
      (u.sku ? ` (${u.sku})` : "")}
  </option>
))}

                        </select>

                        <input
                          className="mt-1 w-full border rounded px-2 py-1"
                          placeholder="Ürün adı (seçmezsen oluşturur)"
                          value={r.ad}
                          onChange={(e) => updateRow(i, "ad", e.target.value)}
                        />
                      </td>

                      <td className="border px-2 py-1 min-w-[160px]">
                        <input
                          value={r.barkod}
                          onChange={(e) =>
                            updateRow(i, "barkod", e.target.value)
                          }
                          onBlur={() => onBarcodeBlur(i)}
                          className="w-full border rounded px-2 py-1"
                          placeholder="Barkod"
                        />
                      </td>

                      <td className="border px-2 py-1 text-right min-w-[90px]">
                        <input
                          type="number"
                          value={r.adet}
                          onChange={(e) => updateRow(i, "adet", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-right"
                          min="0"
                        />
                      </td>

                      <td className="border px-2 py-1 text-right min-w-[120px]">
                        <input
                          type="number"
                          value={r.fiyat}
                          onChange={(e) => updateRow(i, "fiyat", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-right"
                          min="0"
                        />
                      </td>

                      <td className="border px-2 py-1 text-right min-w-[70px]">
                        <select
                          value={r.kdv ?? 20}
                          onChange={(e) => updateRow(i, "kdv", Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-right"
                        >
                          {KDV_ORANLARI.map((o) => (
                            <option key={o} value={o}>%{o}</option>
                          ))}
                        </select>
                      </td>

                      <td className="border px-2 py-1 text-right min-w-[70px]">
                        <input
                          type="number"
                          value={r.iskonto ?? 0}
                          onChange={(e) => updateRow(i, "iskonto", Number(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-right"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                        />
                      </td>

                      <td className="border px-2 py-1 min-w-[90px]">
                        <select
                          value={r.currency || "TRY"}
                          onChange={(e) => onCurrencyChange(i, e.target.value)}
                          className="w-full border rounded px-2 py-1"
                        >
                          <option value="TRY">TRY</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </td>

                      <td className="border px-2 py-1 text-right min-w-[100px]">
                        <input
                          type="number"
                          value={r.fxRate ?? getFx(r.currency || "TRY")}
                          onChange={(e) => updateRow(i, "fxRate", Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-right"
                          step="0.0001"
                          min="0"
                          disabled={r.currency === "TRY"}
                        />
                      </td>

                      <td className="border px-2 py-1 text-right min-w-[120px]">
                        {Number(totalTry || 0).toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="border px-2 py-1 text-center w-[60px]">
                        <button
                          onClick={() => removeRow(i)}
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          title="Satırı sil"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3">
            <div className="text-sm text-gray-600">
              Toplam (₺):{" "}
              <b>
                {Number(toplamTRY || 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </b>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || role === "admin"}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet ✅"}
            </button>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
