"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export default function UrunAlis() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [cariId, setCariId] = useState("");
  const [rates, setRates] = useState({ TRY: 1, USD: 0, EUR: 0 });
  const [manualRates, setManualRates] = useState({ USD: "", EUR: "" });
  const [loadingRates, setLoadingRates] = useState(false);
  const [token, setToken] = useState(""); // ✅ token state eklendi

  const emptyRow = {
    barkod: "", productId: "", ad: "",
    adet: 1, fiyat: 0, kdv: 20,
    currency: "TRY", seriNo: []
  };

  const [rows, setRows] = useState([ emptyRow ]);

  // ✅ Token güvenli şekilde al
  useEffect(() => {
    const t = Cookies.get("token");
    if (t) setToken(t);
  }, []);

  // ✅ Cari & ürünler
  useEffect(() => {
    if (!token) return;
    fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCariler(Array.isArray(d) ? d : []));
    fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUrunler(Array.isArray(d) ? d : []));
  }, [token]);

  // ✅ Kur çek
  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const r = await fetch("/api/rates/tcmb");
      const data = await r.json();
      if (r.ok && data?.rates) setRates(data.rates);
      else alert("Kur alınamadı");
    } catch (err) {
      console.error("Kur hatası:", err);
    }
    setLoadingRates(false);
  };

  useEffect(() => { fetchRates(); }, []);

  const effectiveRate = (cur) => {
    if (cur === "USD") return Number(manualRates.USD) || rates.USD || 0;
    if (cur === "EUR") return Number(manualRates.EUR) || rates.EUR || 0;
    return 1;
  };

  const handleBarkod = (i, val) => {
    let copy = [...rows];
    copy[i].barkod = val;
    const urun = Array.isArray(urunler) ? urunler.find(u => u.barkod === val) : null;
    if (urun) {
      copy[i].productId = urun._id;
      copy[i].ad = urun.ad;
      copy[i].fiyat = urun.alisFiyati || 0;
      copy[i].kdv = urun.kdvOrani || 20;
    }
    setRows(copy);
  };

  const handleUrunAd = (i, val) => {
    let copy = [...rows];
    copy[i].ad = val;
    const urun = Array.isArray(urunler) ? urunler.find(x => x.ad === val) : null;
    if (urun) {
      copy[i].productId = urun._id;
      copy[i].barkod = urun.barkod || "";
      copy[i].fiyat = urun.alisFiyati || 0;
      copy[i].kdv = urun.kdvOrani || 20;
    }
    setRows(copy);
  };

  const updateRow = (i, f, v) => {
    let copy = [...rows];
    copy[i][f] = v;
    setRows(copy);
  };

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  const rowTL = (r) => {
    const fx = effectiveRate(r.currency);
    const total = Number(r.adet) * Number(r.fiyat);
    const withKdv = total + (total * Number(r.kdv)) / 100;
    return r.currency === "TRY" ? withKdv : Number((withKdv * fx).toFixed(2));
  };

  // ✅ Kaydet
  const handleSave = async () => {
    if (!cariId) return alert("⚠️ Tedarikçi seçin");
    if (!token) return alert("⚠️ Giriş yapınız");

    for (let r of rows) {
      let productId = r.productId;

      // ✅ Ürün yoksa oluştur
      if (!productId && r.ad.trim() !== "") {
        const res = await fetch("/api/urunler", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ad: r.ad,
            barkod: r.barkod,
            alisFiyati: r.fiyat,
            satisFiyati: 0,
            stok: 0,
            kdvOrani: Number(r.kdv),
            paraBirimi: r.currency
          })
        });
        const d = await res.json();
        productId = d?._id || productId;
      }

      if (!productId) continue;
      const fx = effectiveRate(r.currency);
      const totalTRY = rowTL(r);

      await fetch("/api/cari/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: cariId,
          productId,
          type: "purchase",
          quantity: Number(r.adet),
          unitPrice: Number(r.fiyat),
          currency: r.currency,
          fxRate: r.currency === "TRY" ? 1 : fx,
          totalTRY
        })
      });
    }

    alert("✅ Ürün alışı kaydedildi!");
    setRows([{ ...emptyRow }]);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">📦 Ürün Alışı</h2>

      <div className="p-3 bg-white rounded border flex items-center gap-4 text-sm">
        <b>Kur:</b>{" "}
        {loadingRates
          ? "Yükleniyor..."
          : `USD ₺${rates.USD}, EUR ₺${rates.EUR}`}
        <button
          onClick={fetchRates}
          className="px-2 py-1 bg-gray-100 border rounded"
        >
          Güncelle
        </button>
      </div>

      <select
        className="border p-2 rounded"
        value={cariId}
        onChange={(e) => setCariId(e.target.value)}
      >
        <option value="">Tedarikçi Seç *</option>
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
            rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="input"
                    value={r.barkod}
                    onChange={(e) => handleBarkod(i, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    list="urunList"
                    className="input"
                    value={r.ad}
                    onChange={(e) => handleUrunAd(i, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="input w-14"
                    value={r.adet}
                    onChange={(e) => updateRow(i, "adet", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="input w-20"
                    value={r.fiyat}
                    onChange={(e) => updateRow(i, "fiyat", e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="input"
                    value={r.currency}
                    onChange={(e) => updateRow(i, "currency", e.target.value)}
                  >
                    <option>TRY</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </td>
                <td>
                  <select
                    className="input w-16"
                    value={r.kdv}
                    onChange={(e) => updateRow(i, "kdv", e.target.value)}
                  >
                    {[0, 1, 8, 10, 20].map((k) => (
                      <option key={k} value={k}>
                        %{k}
                      </option>
                    ))}
                  </select>
                </td>
                <td>₺{rowTL(r)}</td>
                <td>
                  <button
                    className="text-red-600"
                    onClick={() => removeRow(i)}
                  >
                    ✖
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <datalist id="urunList">
        {Array.isArray(urunler) &&
          urunler.map((u) => <option key={u._id} value={u.ad} />)}
      </datalist>

      <button
        onClick={addRow}
        className="bg-gray-200 px-3 py-1 rounded"
      >
        + Satır
      </button>
      <button
        onClick={handleSave}
        className="bg-green-600 text-white px-4 py-2"
      >
        Kaydet ✅
      </button>
    </div>
  );
}
