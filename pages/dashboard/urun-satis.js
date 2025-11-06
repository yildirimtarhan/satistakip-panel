"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export default function UrunSatis() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [cariId, setCariId] = useState("");
  const [rates, setRates] = useState({ TRY: 1, USD: 0, EUR: 0 });
  const [manualRates, setManualRates] = useState({ USD: "", EUR: "" });
  const [token, setToken] = useState("");

  const emptyRow = {
    barkod: "",
    productId: "",
    ad: "",
    varyant: "",
    adet: 1,
    fiyat: 0,
    kdv: 20,
    currency: "TRY",
  };

  const [rows, setRows] = useState([emptyRow]);

  // ✅ Token güvenli alınır
  useEffect(() => {
    const t = Cookies.get("token");
    if (t) setToken(t);
  }, []);

  // ✅ Veri yükleme
  useEffect(() => {
    if (!token) return;

    fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCariler(Array.isArray(d) ? d : []));

    fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setUrunler(Array.isArray(d) ? d : []));

    fetchRates();
  }, [token]);

  // ✅ Kurlar
  const fetchRates = async () => {
    try {
      const r = await fetch("/api/rates/tcmb");
      const data = await r.json();
      if (r.ok && data?.rates) setRates(data.rates);
    } catch (e) {
      console.error("Kur hatası:", e);
    }
  };

  const effectiveRate = (cur) =>
    cur === "USD"
      ? Number(manualRates.USD) || rates.USD
      : cur === "EUR"
      ? Number(manualRates.EUR) || rates.EUR
      : 1;

  const setRow = (i, obj) => {
    const c = [...rows];
    c[i] = { ...c[i], ...obj };
    setRows(c);
  };

  const handleBarkod = (i, val) => {
    setRow(i, { barkod: val });
    const urun = Array.isArray(urunler)
      ? urunler.find((u) => u.barkod === val)
      : null;
    if (urun) {
      setRow(i, {
        productId: urun._id,
        ad: urun.ad,
        fiyat: urun.satisFiyati || 0,
        kdv: urun.kdvOrani || 20,
        varyant: "",
      });
    }
  };

  const handleUrunAd = (i, val) => {
    setRow(i, { ad: val });
    const urun = Array.isArray(urunler)
      ? urunler.find((x) => x.ad === val)
      : null;
    if (urun)
      setRow(i, {
        productId: urun._id,
        barkod: urun.barkod || "",
        fiyat: urun.satisFiyati || 0,
        kdv: urun.kdvOrani || 20,
        varyant: "",
      });
  };

  const rowTL = (r) => {
    const fx = effectiveRate(r.currency);
    const total = Number(r.adet) * Number(r.fiyat);
    const withKdv = total + (total * Number(r.kdv)) / 100;
    return r.currency === "TRY" ? withKdv : withKdv * fx;
  };

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  // ✅ Kaydet
  const handleSave = async () => {
    if (!cariId) return alert("⚠️ Müşteri seçin");
    if (!token) return alert("⚠️ Giriş yapılmamış");

    for (let r of rows) {
      if (!r.productId) return alert("⚠️ Ürün seçilmedi");

      const urun = Array.isArray(urunler)
        ? urunler.find((u) => u._id === r.productId)
        : null;
      if (!urun) continue;

      let stok = urun.stok || 0;
      if (r.varyant && Array.isArray(urun.varyantlar)) {
        const v = urun.varyantlar.find((x) => x.ad === r.varyant);
        stok = v ? v.stok : 0;
      }

      if (stok < Number(r.adet)) {
        return alert(
          `❌ ${urun.ad} / ${r.varyant || "-"} stok yetersiz! (Stok: ${stok})`
        );
      }

      const fx = effectiveRate(r.currency);
      const totalTRY = rowTL(r);

      await fetch("/api/cari/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: cariId,
          productId: r.productId,
          varyant: r.varyant || null,
          type: "sale",
          quantity: Number(r.adet),
          unitPrice: Number(r.fiyat),
          currency: r.currency,
          fxRate: fx,
          totalTRY,
        }),
      });
    }

    alert("✅ Satış kaydedildi!");
    setRows([{ ...emptyRow }]);
  };

  const netTotal = Array.isArray(rows)
    ? rows.reduce((s, r) => s + rowTL(r), 0)
    : 0;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">🛒 Ürün Satışı</h2>

      <div className="p-3 bg-white rounded border flex-wrap flex items-center gap-2 text-sm">
        <b>Kur:</b> USD ₺{rates.USD} | EUR ₺{rates.EUR}
        <input
          placeholder="USD"
          className="border p-1 w-20"
          value={manualRates.USD}
          onChange={(e) =>
            setManualRates({ ...manualRates, USD: e.target.value })
          }
        />
        <input
          placeholder="EUR"
          className="border p-1 w-20"
          value={manualRates.EUR}
          onChange={(e) =>
            setManualRates({ ...manualRates, EUR: e.target.value })
          }
        />
        <button onClick={fetchRates} className="px-2 py-1 border rounded">
          🔄
        </button>
      </div>

      <select
        className="border p-2 rounded"
        value={cariId}
        onChange={(e) => setCariId(e.target.value)}
      >
        <option value="">Müşteri Seç *</option>
        {Array.isArray(cariler) &&
          cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
      </select>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100 text-xs">
          <tr>
            <th>Barkod</th>
            <th>Ürün</th>
            <th>Varyant</th>
            <th>Adet</th>
            <th>Fiyat</th>
            <th>PB</th>
            <th>KDV</th>
            <th>TL</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {Array.isArray(rows) &&
            rows.map((r, i) => {
              const urun = Array.isArray(urunler)
                ? urunler.find((u) => u._id === r.productId)
                : null;
              return (
                <tr key={i} className="text-xs">
                  <td>
                    <input
                      className="border p-1 w-full"
                      value={r.barkod}
                      onChange={(e) => handleBarkod(i, e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      list="urunList"
                      className="border p-1 w-full"
                      value={r.ad}
                      onChange={(e) => handleUrunAd(i, e.target.value)}
                    />
                  </td>

                  <td>
                    {urun?.varyantlar?.length > 0 ? (
                      <select
                        className="border p-1 w-full"
                        value={r.varyant}
                        onChange={(e) => setRow(i, { varyant: e.target.value })}
                      >
                        <option value="">Seç</option>
                        {urun.varyantlar.map((v) => (
                          <option key={v.ad} value={v.ad}>
                            {v.ad} ({v.stok})
                          </option>
                        ))}
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <input
                      className="border p-1 w-14 text-right"
                      value={r.adet}
                      onChange={(e) => setRow(i, { adet: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="border p-1 w-20 text-right"
                      value={r.fiyat}
                      onChange={(e) => setRow(i, { fiyat: e.target.value })}
                    />
                  </td>

                  <td>
                    <select
                      className="border p-1 w-full"
                      value={r.currency}
                      onChange={(e) =>
                        setRow(i, { currency: e.target.value })
                      }
                    >
                      <option>TRY</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                  </td>

                  <td>
                    <select
                      className="border p-1 w-full"
                      value={r.kdv}
                      onChange={(e) => setRow(i, { kdv: e.target.value })}
                    >
                      {[0, 1, 8, 10, 20].map((k) => (
                        <option key={k} value={k}>
                          %{k}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="text-right font-medium">
                    ₺{rowTL(r).toLocaleString("tr-TR")}
                  </td>

                  <td>
                    <button
                      className="text-red-600"
                      onClick={() => removeRow(i)}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      <datalist id="urunList">
        {Array.isArray(urunler) &&
          urunler.map((u) => <option key={u._id} value={u.ad} />)}
      </datalist>

      <div className="flex items-center gap-3 mt-2">
        <button onClick={addRow} className="bg-gray-200 px-3 py-1 rounded">
          + Satır
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2"
        >
          Kaydet ✅
        </button>
        <span className="ml-auto font-bold text-lg">
          Genel: ₺{netTotal.toLocaleString("tr-TR")}
        </span>
      </div>
    </div>
  );
}
