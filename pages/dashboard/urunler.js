// 📄 /pages/dashboard/urunler.js
import { useState, useEffect } from "react";

export default function UrunlerPanel() {
  const [urunler, setUrunler] = useState([]);
  const [editProduct, setEditProduct] = useState(null);

  const emptyForm = {
    ad: "",
    barkod: "",
    sku: "",
    marka: "",
    kategori: "",
    aciklama: "",
    birim: "Adet",
    alisFiyati: "",
    satisFiyati: "",
    stok: 0,
    stokUyari: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
    resimUrl: "",
    varyantlar: [] // { ad, stok }
  };
  const [form, setForm] = useState(emptyForm);

  // ⬇️ Excel helpers
  const downloadBlob = (blob, filename) => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  async function exportUrunler() {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/urunler/export", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return alert("❌ Export başarısız");
    const blob = await res.blob();
    downloadBlob(blob, "urunler.xlsx");
  }

  async function importUrunler(file) {
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/urunler/import", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const data = await res.json().catch(()=> ({}));
    if (!res.ok) return alert("❌ Import başarısız");
    alert(`✅ ${data.count || 0} ürün içe aktarıldı`);
    fetchUrunler();
  }

  // ✅ Ürünleri getir
  const fetchUrunler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/urunler", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUrunler(Array.isArray(data) ? data : []);
  };
  useEffect(() => { fetchUrunler(); }, []);

  // ✅ Kaydet / Güncelle
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.ad.trim()) return alert("⚠️ Ürün adı gerekli");
    if (!form.satisFiyati) return alert("⚠️ Satış fiyatı gerekli");

    let url = "/api/urunler";
    let method = "POST";

    const toplamStok = (form.varyantlar || []).reduce((s, v) => s + (Number(v.stok) || 0), 0);

    if (editProduct) {
      url += `?id=${editProduct._id}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        stok: toplamStok, // ✅ toplam varyant stok
        alisFiyati: Number(form.alisFiyati || 0),
        satisFiyati: Number(form.satisFiyati),
        stokUyari: Number(form.stokUyari || 0),
        kdvOrani: Number(form.kdvOrani)
      })
    });

    if (!res.ok) return alert("❌ Hata oluştu");

    alert(editProduct ? "✅ Ürün güncellendi" : "✅ Ürün eklendi");
    setForm(emptyForm);
    setEditProduct(null);
    fetchUrunler();
  };

  // ✅ Sil
  const handleDelete = async (id) => {
    if (!confirm("Silinsin mi?")) return;
    const token = localStorage.getItem("token");
    await fetch(`/api/urunler?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchUrunler();
  };

  // ✅ Düzenle
  const handleEdit = (u) => {
    setEditProduct(u);
    setForm({
      ...emptyForm,
      ...u,
      varyantlar: u.varyantlar || []
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Görsel yükleme
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok && data?.url) setForm((f) => ({ ...f, resimUrl: data.url }));
    else alert("❌ Görsel yüklenemedi");
  };

  // ✅ Varyant Sil
  const removeVariant = (i) => {
    const newVars = (form.varyantlar || []).filter((_, x) => x !== i);
    setForm({ ...form, varyantlar: newVars });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4 text-center">📦 Ürün Yönetimi</h1>

      {/* Excel Araç Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow mb-4">
        <div className="font-semibold">Ürünler</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportUrunler}
            className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
          >
            ⬇️ Excel Dışa Aktar
          </button>

          <label className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 cursor-pointer">
            📥 Excel İçe Aktar
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                await importUrunler(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow grid grid-cols-12 gap-4 mb-8">
        <input className="input col-span-6" placeholder="Ürün Adı *"
          value={form.ad} onChange={(e)=>setForm({...form, ad:e.target.value})} required />

        <input className="input col-span-3" placeholder="Barkod"
          value={form.barkod} onChange={(e)=>setForm({...form, barkod:e.target.value})} />

        <input className="input col-span-3" placeholder="SKU / Model"
          value={form.sku} onChange={(e)=>setForm({...form, sku:e.target.value})} />

        <input className="input col-span-3" placeholder="Marka"
          value={form.marka} onChange={(e)=>setForm({...form, marka:e.target.value})} />

        <input className="input col-span-3" placeholder="Kategori"
          value={form.kategori} onChange={(e)=>setForm({...form, kategori:e.target.value})} />

        <select className="input col-span-2" value={form.birim} onChange={(e)=>setForm({...form, birim:e.target.value})}>
          <option>Adet</option><option>Kutu</option><option>Paket</option><option>KG</option><option>Litre</option>
        </select>

        <select className="input col-span-2" value={form.paraBirimi} onChange={(e)=>setForm({...form, paraBirimi:e.target.value})}>
          <option>TRY</option><option>USD</option><option>EUR</option>
        </select>

        <select className="input col-span-2" value={form.kdvOrani} onChange={(e)=>setForm({...form, kdvOrani:e.target.value})}>
          {[1,8,10,18,20].map(k=> <option key={k} value={k}>%{k}</option>)}
        </select>

        <input className="input col-span-3" placeholder="Alış Fiyatı"
          value={form.alisFiyati} onChange={(e)=>setForm({...form, alisFiyati:e.target.value})} />

        <input className="input col-span-3" placeholder="Satış Fiyatı *"
          value={form.satisFiyati} onChange={(e)=>setForm({...form, satisFiyati:e.target.value})} required />

        <input className="input col-span-3" placeholder="Stok Uyarı Seviyesi"
          value={form.stokUyari} onChange={(e)=>setForm({...form, stokUyari:e.target.value})} />

        {/* Varyant + Stok */}
        <div className="col-span-12 mt-2">
          <label className="font-medium mb-1">Varyant & Stok</label>
          <div className="flex gap-2 mb-1">
            <input id="varInput" className="input" placeholder="Varyant (Örn: Kırmızı-L)" />
            <input id="varStok" className="input w-28" placeholder="Stok" />
            <button
              type="button"
              className="btn"
              onClick={()=>{
                const el=document.getElementById("varInput");
                const st=document.getElementById("varStok");
                if(!el.value.trim()) return;
                setForm((f)=>({
                  ...f,
                  varyantlar:[...(f.varyantlar||[]), { ad: el.value, stok: Number(st.value)||0 }]
                }));
                el.value=""; st.value="";
              }}
            >➕ Ekle</button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {(form.varyantlar||[]).map((v,i)=>(
              <span key={i} className="px-2 py-1 bg-orange-200 rounded flex items-center gap-2">
                {v.ad} — <b>{v.stok} stk</b>
                <button type="button" className="text-red-600" onClick={()=>removeVariant(i)}>✖</button>
              </span>
            ))}
          </div>
        </div>

        {/* Fotoğraf */}
        <div className="col-span-12">
          <input type="file" onChange={handleImageUpload}/>
          {form.resimUrl && <img src={form.resimUrl} className="w-20 h-20 mt-2 rounded border" />}
        </div>

        {/* Açıklama */}
        <textarea className="input col-span-12 h-20" placeholder="Açıklama"
          value={form.aciklama} onChange={(e)=>setForm({...form, aciklama:e.target.value})} />

        <div className="col-span-12 flex justify-end gap-2">
          {editProduct && <button type="button" className="btn-gray" onClick={()=>{setForm(emptyForm); setEditProduct(null);}}>İptal</button>}
          <button className="btn-primary">{editProduct ? "Güncelle" : "Kaydet"}</button>
        </div>
      </form>

      {/* Liste */}
      <table className="w-full bg-white rounded-xl shadow text-sm">
        <thead className="bg-orange-100">
          <tr>
            <th>#</th><th>Ürün</th><th>Barkod</th><th>SKU</th><th>Stok</th><th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {urunler.map((u,i)=>(
            <tr key={u._id} className="border-b hover:bg-slate-50">
              <td>{i+1}</td>
              <td className="flex items-center gap-2 p-2">
                {u.resimUrl && <img src={u.resimUrl} className="w-8 h-8 rounded" />}
                {u.ad}
              </td>
              <td>{u.barkod}</td>
              <td>{u.sku}</td>
              <td><b>{u.stok}</b></td>
              <td className="space-x-2">
                <button className="text-blue-600" onClick={()=>handleEdit(u)}>✏️</button>
                <button className="text-red-600" onClick={()=>handleDelete(u._id)}>🗑️</button>
              </td>
            </tr>
          ))}
          {urunler.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-gray-500">Kayıt yok</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
