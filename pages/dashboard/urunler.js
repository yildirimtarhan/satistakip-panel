// 📄 /pages/dashboard/urunler.js
import { useState, useEffect } from "react";

export default function UrunlerPanel() {
  const [urunler, setUrunler] = useState([]);
  const [editProduct, setEditProduct] = useState(null);

  const [form, setForm] = useState({
    ad: "",
    satisFiyati: "",
    stok: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
    resimUrl: "",
    varyantlar: []
  });

  // 📌 Ürünleri getir
  const fetchUrunler = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/urunler", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUrunler(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Ürünleri çekme hatası:", e);
    }
  };

  useEffect(() => {
    fetchUrunler();
  }, []);

  // 📌 Ürün Kaydet / Güncelle
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    let url = "/api/urunler";
    let method = "POST";

    if (editProduct) {
      url += `?id=${editProduct._id}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...form,
        satisFiyati: Number(form.satisFiyati),
        stok: Number(form.stok),
        kdvOrani: Number(form.kdvOrani),
      }),
    });

    const data = await res.json();
    if (!res.ok) return alert("❌ " + data.message);

    alert(editProduct ? "✅ Ürün güncellendi" : "✅ Ürün eklendi");

    setForm({
      ad: "",
      satisFiyati: "",
      stok: "",
      paraBirimi: "TRY",
      kdvOrani: 20,
      resimUrl: "",
      varyantlar: []
    });
    setEditProduct(null);
    fetchUrunler();
  };

  // 📌 Sil
  const handleDelete = async (id) => {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/urunler?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) return alert("❌ " + data.message);

    alert("🗑️ Ürün silindi");
    fetchUrunler();
  };

  // 📌 Düzenle
  const handleEdit = (u) => {
    setEditProduct(u);
    setForm({
      ad: u.ad,
      satisFiyati: u.satisFiyati,
      stok: u.stok,
      paraBirimi: u.paraBirimi,
      kdvOrani: u.kdvOrani,
      resimUrl: u.resimUrl || "",
      varyantlar: u.varyantlar || []
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center text-orange-600 mb-6">
        🛍️ Ürün Yönetim Paneli
      </h1>

      {/* ✅ Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-12 gap-4 max-w-4xl mx-auto mb-10 bg-white p-6 rounded-xl shadow"
      >
        <input type="text" placeholder="Ürün Adı"
          value={form.ad}
          onChange={(e) => setForm({...form, ad: e.target.value})}
          className="border p-2 rounded col-span-12 md:col-span-4"
          required
        />

        <input type="number" placeholder="Satış Fiyatı"
          value={form.satisFiyati}
          onChange={(e) => setForm({...form, satisFiyati: e.target.value})}
          className="border p-2 rounded col-span-6 md:col-span-2" required
        />

        <input type="number" placeholder="Stok"
          value={form.stok}
          onChange={(e) => setForm({...form, stok: e.target.value})}
          className="border p-2 rounded col-span-6 md:col-span-2" required
        />

        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={form.paraBirimi}
          onChange={(e) => setForm({...form, paraBirimi: e.target.value})}
        >
          <option>TRY</option><option>USD</option><option>EUR</option>
        </select>

        <select className="border p-2 rounded col-span-6 md:col-span-2"
          value={form.kdvOrani}
          onChange={(e) => setForm({...form, kdvOrani: e.target.value})}
        >
          <option value="1">%1</option>
          <option value="10">%10</option>
          <option value="20">%20</option>
        </select>

        {/* 📷 Ürün Fotoğrafı */}
<div className="col-span-12">
  <label className="text-sm font-medium text-gray-700">Ürün Fotoğrafı</label>

  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      // ✅ Cloudinary upload API çağrısı
      const uploadRes = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await uploadRes.json();

      if (uploadRes.ok) {
        setForm({ ...form, resimUrl: data.url });
        alert("✅ Görsel yüklendi!");
      } else {
        alert("❌ Görsel yüklenemedi: " + data.error);
      }
    }}
  />

  {/* Önizleme */}
  {form.resimUrl && (
    <img
      src={form.resimUrl}
      className="w-24 h-24 mt-2 rounded border object-cover"
      alt="Ürün görseli"
    />
  )}
</div>

          
        {/* ✅ Varyant ekleme */}
        <div className="col-span-12 border-t pt-3">
          <label className="font-medium text-gray-700">Varyantlar</label>

          <div className="flex flex-wrap gap-2 my-2">
            {form.varyantlar.map((v,i)=>(
              <div key={i} className="bg-orange-200 px-2 py-1 rounded flex items-center gap-2">
                {v}
                <button className="text-red-600"
                  onClick={()=>setForm({...form, varyantlar: form.varyantlar.filter((_,idx)=>idx!==i)})}
                >✖</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input id="varInput" placeholder="Renk - Beden (Örn: Kırmızı-L)"
              className="border p-2 rounded w-full"
            />
            <button type="button"
              className="bg-orange-500 text-white px-3 rounded"
              onClick={()=>{
                const el = document.getElementById("varInput");
                if(el.value.trim()==="") return;
                setForm({...form, varyantlar:[...(form.varyantlar||[]), el.value]});
                el.value="";
              }}
            >➕</button>
          </div>
        </div>

        <div className="col-span-12 flex justify-end gap-3 mt-4">
          {editProduct && (
            <button type="button"
              className="px-4 py-2 bg-gray-500 text-white rounded"
              onClick={()=>{ setForm({ad:"",satisFiyati:"",stok:"",paraBirimi:"TRY",kdvOrani:20,resimUrl:"",varyantlar:[]}); setEditProduct(null); }}
            >İptal</button>
          )}

          <button type="submit" className="px-5 py-2 bg-orange-500 text-white rounded">
            {editProduct ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>

      {/* ✅ Ürün Listesi */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th>#</th><th>Ürün</th><th>Fiyat</th><th>KDV</th>
              <th>KDV Dahil</th><th>Stok</th><th>PB</th><th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {urunler.map((u,i)=>{
              const fiyat = Number(u.satisFiyati||0);
              const toplam = fiyat + (fiyat * Number(u.kdvOrani||0))/100;
              return (
                <tr key={u._id}>
                  <td>{i+1}</td>
                  <td className="flex items-center gap-2 p-2">
                    {u.resimUrl && <img src={u.resimUrl} className="w-8 h-8 rounded border"/>}
                    {u.ad}
                  </td>
                  <td>{fiyat} {u.paraBirimi}</td>
                  <td>%{u.kdvOrani}</td>
                  <td>{toplam.toFixed(2)} {u.paraBirimi}</td>
                  <td>{u.stok}</td>
                  <td>{u.paraBirimi}</td>
                  <td className="space-x-2">
                    <button className="text-blue-600" onClick={()=>handleEdit(u)}>✏️</button>
                    <button className="text-red-600" onClick={()=>handleDelete(u._id)}>🗑️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
