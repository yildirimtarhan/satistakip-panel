// 📄 /pages/dashboard/efatura/olustur.js
import { useEffect, useState } from "react";

export default function EFaturaOlustur() {
  const [cariler, setCariler] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedCari, setSelectedCari] = useState("");
  const [items, setItems] = useState([
    { ad: "", miktar: 1, fiyat: 0, kdv: 20 },
  ]);

  const [note, setNote] = useState("");

  useEffect(() => {
    fetchCariler();
    fetchProducts();
  }, []);

  const fetchCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setCariler(await res.json());
  };

  const fetchProducts = async () => {
    const res = await fetch("/api/urunler", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setProducts(await res.json());
  };

  const addRow = () => {
    setItems([...items, { ad: "", miktar: 1, fiyat: 0, kdv: 20 }]);
  };

  const deleteRow = (index) => {
    const arr = [...items];
    arr.splice(index, 1);
    setItems(arr);
  };

  const updateRow = (index, key, value) => {
    const arr = [...items];
    arr[index][key] = value;
    setItems(arr);
  };

  // Hesaplama
  const hesap = items.reduce(
    (acc, row) => {
      const ara = row.miktar * row.fiyat;
      const kdvTutar = (ara * row.kdv) / 100;
      return {
        araToplam: acc.araToplam + ara,
        kdvToplam: acc.kdvToplam + kdvTutar,
        genel: acc.genel + ara + kdvTutar,
      };
    },
    { araToplam: 0, kdvToplam: 0, genel: 0 }
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        ➕ Yeni E-Fatura Oluştur
      </h1>

      {/* Cari Seçimi */}
      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-slate-700">👤 Cari Seç</h2>

        <select
          className="input"
          value={selectedCari}
          onChange={(e) => setSelectedCari(e.target.value)}
        >
          <option value="">Cari Seçin...</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad} — {c.vergiTipi}:{c.vergiNo}
            </option>
          ))}
        </select>
      </div>

      {/* Ürün satırları */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-slate-700">📦 Ürün / Hizmet Satırları</h2>

        {items.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 border-b pb-3">
            {/* Ürün adı */}
            <div className="col-span-4">
              <input
                list="urunListesi"
                className="input"
                placeholder="Ürün adı"
                value={row.ad}
                onChange={(e) => updateRow(i, "ad", e.target.value)}
              />
            </div>

            {/* Miktar */}
            <div className="col-span-2">
              <input
                type="number"
                className="input"
                value={row.miktar}
                onChange={(e) => updateRow(i, "miktar", Number(e.target.value))}
              />
            </div>

            {/* Fiyat */}
            <div className="col-span-3">
              <input
                type="number"
                className="input"
                value={row.fiyat}
                onChange={(e) => updateRow(i, "fiyat", Number(e.target.value))}
              />
            </div>

            {/* KDV */}
            <div className="col-span-2">
              <input
                type="number"
                className="input"
                value={row.kdv}
                onChange={(e) => updateRow(i, "kdv", Number(e.target.value))}
              />
            </div>

            {/* Sil */}
            <div className="col-span-1 flex items-center">
              <button
                onClick={() => deleteRow(i)}
                className="text-red-600 font-bold text-xl"
              >
                ✖
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addRow}
          className="btn-primary mt-3"
        >
          ➕ Satır Ekle
        </button>
      </div>

      {/* Datalist - ürün listesi */}
      <datalist id="urunListesi">
        {products.map((p) => (
          <option key={p._id} value={p.urunAdi} />
        ))}
      </datalist>

      {/* Not */}
      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-slate-700">📝 Not / Açıklama</h2>
        <textarea
          className="input h-24"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Toplamlar */}
      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-slate-700">💰 Toplamlar</h2>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-slate-500">Ara Toplam</div>
            <div className="text-xl font-bold">
              ₺{hesap.araToplam.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500">KDV</div>
            <div className="text-xl font-bold">
              ₺{hesap.kdvToplam.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Genel Toplam</div>
            <div className="text-xl font-bold text-green-600">
              ₺{hesap.genel.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Gönder Button */}
      <div className="text-right">
        <button className="bg-orange-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-orange-700">
          🚀 Fatura Oluştur & Gönder
        </button>
      </div>
    </div>
  );
}
