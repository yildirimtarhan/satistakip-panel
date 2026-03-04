import { useState, useEffect } from "react";
import Link from "next/link";
import { tutarYazili } from "@/utils/tutarYazili";

export default function EFaturaOlustur() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [selectedCari, setSelectedCari] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notlar, setNotlar] = useState("");
  const [vadeTarihi, setVadeTarihi] = useState("");
  const [genelIskontoOrani, setGenelIskontoOrani] = useState(0);
  const [company, setCompany] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCariler)
      .catch(console.error);
    fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setUrunler)
      .catch(console.error);
    fetch("/api/settings/company", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCompany)
      .catch(() => setCompany(null));
  }, [token]);

  const addRow = () => {
    setItems([...items, { urunId: "", adet: 1, fiyat: 0, kdv: 20, iskonto: 0 }]);
  };

  const updateRow = (index, key, val) => {
    const newRows = [...items];
    newRows[index][key] = val;

    // Ürün seçilmişse birim fiyatı otomatik çek (Product: name, price; _id string karşılaştır)
    if (key === "urunId") {
      const urun = urunler.find((u) => String(u._id) === String(val));
      if (urun) {
        newRows[index].fiyat = Number(urun.price ?? urun.satisFiyati ?? 0);
        newRows[index].kdv = Number(urun.kdv ?? 20);
      }
    }
    setItems(newRows);
  };

  // Toplamlar: satır iskontosu (%), sonra genel iskonto (%)
  const { araToplam, iskontoTutar, araToplamIskontolu, kdvToplam, genelToplam } = items.reduce(
    (acc, row) => {
      const adet = Number(row.adet) || 0;
      const fiyat = Number(row.fiyat) || 0;
      const kdvOran = Number(row.kdv) || 0;
      const satirIskonto = Number(row.iskonto) || 0;
      let net = adet * fiyat;
      const satirIskontoTutar = (net * satirIskonto) / 100;
      net -= satirIskontoTutar;
      const kdvTutar = (net * kdvOran) / 100;
      acc.araToplam += net + satirIskontoTutar;
      acc.iskontoTutar += satirIskontoTutar;
      acc.araToplamIskontolu += net;
      acc.kdvToplam += kdvTutar;
      acc.genelToplam += net + kdvTutar;
      return acc;
    },
    { araToplam: 0, iskontoTutar: 0, araToplamIskontolu: 0, kdvToplam: 0, genelToplam: 0 }
  );
  const genelIskontoTutar = (genelToplam * Number(genelIskontoOrani || 0)) / 100;
  const genelToplamSon = genelToplam - genelIskontoTutar;
  const tutarYaziliMetin = tutarYazili(genelToplamSon);

  const createXML = async () => {
    if (!selectedCari) return alert("Cari seçin");
    if (items.length === 0) return alert("En az 1 ürün ekleyin");

    setLoading(true);

    const payload = {
      cariId: selectedCari,
      items: items.map((row) => ({
        productId: row.urunId,
        adet: row.adet,
        fiyat: row.fiyat,
        kdv: row.kdv,
      })),
    };
    const res = await fetch("/api/efatura/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert("XML oluşturuldu!");
      window.open(data.fileUrl, "_blank");
    } else {
      alert("Hata: " + data.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 E-Fatura Oluştur
      </h1>

      {/* Cari seçimi */}
      <div className="bg-white p-4 rounded-xl shadow">
        <label className="font-semibold">Cari Seç</label>
        <select
          className="input mt-1"
          value={selectedCari}
          onChange={(e) => setSelectedCari(e.target.value)}
        >
          <option value="">Seçiniz...</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad} ({c.vergiTipi}:{c.vergiNo})
            </option>
          ))}
        </select>
      </div>

      {/* Ürün satırları */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex justify-between mb-3">
          <div className="font-semibold">Ürünler</div>
          <button onClick={addRow} className="btn-primary">➕ Satır Ekle</button>
        </div>

        {items.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 p-2 border-b border-slate-200"
          >
            {/* Ürün */}
            <select
              className="input col-span-5"
              value={row.urunId}
              onChange={(e) => updateRow(i, "urunId", e.target.value)}
            >
              <option value="">Ürün seç…</option>
              {urunler.map((u) => (
                <option key={u._id} value={String(u._id)}>
                  {u.name || u.ad || "-"}
                </option>
              ))}
            </select>

            {/* Adet */}
            <input
              type="number"
              className="input col-span-2"
              value={row.adet}
              onChange={(e) => updateRow(i, "adet", e.target.value)}
            />

            {/* Fiyat */}
            <input
              type="number"
              className="input col-span-2"
              value={row.fiyat}
              onChange={(e) => updateRow(i, "fiyat", e.target.value)}
            />

            {/* KDV */}
            <input
              type="number"
              className="input col-span-2"
              value={row.kdv}
              onChange={(e) => updateRow(i, "kdv", e.target.value)}
            />

            {/* Sil */}
            <button
              onClick={() => setItems(items.filter((_, x) => x !== i))}
              className="text-red-600 col-span-1"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* Toplamlar */}
      {items.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow max-w-md ml-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Ara Toplam</span>
              <span>₺{araToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>KDV Toplamı</span>
              <span>₺{kdvToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
              <span>Genel Toplam</span>
              <span className="text-orange-600">₺{genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* XML oluştur butonu */}
      <div className="text-center">
        <button
          onClick={createXML}
          disabled={loading}
          className="btn-primary px-6 py-3"
        >
          {loading ? "Oluşturuluyor..." : "📄 XML Oluştur"}
        </button>
      </div>
    </div>
  );
}
