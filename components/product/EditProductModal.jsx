import { useState } from "react";

export default function EditProductModal({ open, onClose, product, onSave, onDelete }) {
  const [data, setData] = useState(product);
  
  if (!open || !product) return null;

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const handleVarChange = (i, field, value) => {
    const v = [...data.variation];
    v[i][field] = value;
    setData({ ...data, variation: v });
  };

  const addVariation = () => {
    setData({ ...data, variation: [...data.variation, { ad:"", stok:"", fiyat:"" }] });
  };

  const removeVariation = (i) => {
    setData({ ...data, variation: data.variation.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white w-full max-w-2xl rounded-xl p-5 space-y-3">

        <h2 className="text-lg font-bold mb-2">✏️ Ürün Düzenle</h2>

        <input className="input" value={data.ad} onChange={(e) => handleChange("ad", e.target.value)} placeholder="Ürün Adı" />

        <div className="grid grid-cols-2 gap-2">
          <input className="input" value={data.barkod} onChange={(e) => handleChange("barkod", e.target.value)} placeholder="Barkod" />
          <input className="input" value={data.sku} onChange={(e) => handleChange("sku", e.target.value)} placeholder="SKU" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input className="input" type="number" value={data.satisFiyati} onChange={(e) => handleChange("satisFiyati", e.target.value)} placeholder="Satış Fiyatı" />
          <input className="input" type="number" value={data.alisFiyati} onChange={(e) => handleChange("alisFiyati", e.target.value)} placeholder="Alış Fiyatı" />
          <input className="input" type="number" value={data.stok} onChange={(e) => handleChange("stok", e.target.value)} placeholder="Stok" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={data.birim} onChange={(e) => handleChange("birim", e.target.value)}>
            <option>Adet</option><option>Kutu</option><option>Paket</option><option>KG</option>
          </select>
          <select className="input" value={data.kdvOrani} onChange={(e) => handleChange("kdvOrani", e.target.value)}>
            <option value={1}>%1</option><option value={10}>%10</option><option value={20}>%20</option>
          </select>
        </div>

        <label className="font-semibold">Varyantlar</label>
        {data.variation?.map((v, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-1">
            <input className="input" value={v.ad} onChange={(e)=>handleVarChange(i,"ad",e.target.value)} placeholder="Varyant" />
            <input className="input" value={v.stok} onChange={(e)=>handleVarChange(i,"stok",e.target.value)} placeholder="Stok" />
            <input className="input" value={v.fiyat} onChange={(e)=>handleVarChange(i,"fiyat",e.target.value)} placeholder="Fiyat" />
            <button className="btn-red" onClick={()=>removeVariation(i)}>🗑️</button>
          </div>
        ))}
        <button className="btn-gray w-full" onClick={addVariation}>+ Varyant Ekle</button>

        <div className="flex justify-between mt-4">
          <button onClick={() => onDelete(data._id)} className="px-3 py-2 bg-red-500 text-white rounded">🗑️ Sil</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 bg-gray-300 rounded">Kapat</button>
            <button onClick={() => onSave(data)} className="px-3 py-2 bg-orange-500 text-white rounded">Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}
