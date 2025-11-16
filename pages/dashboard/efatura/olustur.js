import { useState, useEffect } from "react";

export default function EFaturaOlustur() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [selectedCari, setSelectedCari] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cari ve ürünleri çek
  useEffect(() => {
    fetch("/api/cari", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => res.json())
      .then(setCariler)
      .catch(console.error);

    fetch("/api/urunler", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => res.json())
      .then(setUrunler)
      .catch(console.error);
  }, []);

  const addRow = () => {
    setItems([...items, { urunId: "", adet: 1, fiyat: 0, kdv: 20 }]);
  };

  const updateRow = (index, key, val) => {
    const newRows = [...items];
    newRows[index][key] = val;

    // Ürün seçilmişse birim fiyatı otomatik çek
    if (key === "urunId") {
      const urun = urunler.find((u) => u._id === val);
      if (urun) {
        newRows[index].fiyat = Number(urun.satisFiyati || 0);
        newRows[index].kdv = Number(urun.kdv || 20);
      }
    }
    setItems(newRows);
  };

  const createXML = async () => {
    if (!selectedCari) return alert("Cari seçin");
    if (items.length === 0) return alert("En az 1 ürün ekleyin");

    setLoading(true);

    const res = await fetch("/api/efatura/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ cariId: selectedCari, items })
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
                <option key={u._id} value={u._id}>
                  {u.ad}
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
