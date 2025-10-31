// 📄 /pages/dashboard/cariler.js
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Cariler() {
  const fileRef = useRef(null);
  const excelRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [cariler, setCariler] = useState([]);
  const [filters, setFilters] = useState({ q:"", tur:"" });

  const emptyForm = {
    ad:"",
    tur:"Müşteri",
    telefon:"",
    email:"",
    vergiTipi:"TCKN",
    vergiNo:"",
    adres:"",
    il:"",
    ilce:"",
    postaKodu:"",
    paraBirimi:"TRY",
    kdvOrani:20,
    // ✅ Pazaryeri alanları
    trendyolCustomerId:"",
    hbCustomerId:"",
  };

  const [form, setForm] = useState(emptyForm);

  const fetchCariler = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cari", {
        headers: { Authorization:`Bearer ${token}` }
      });
      setCariler(await res.json());
    } catch (e) {
      console.log("Cari getirilemedi", e);
    }
  };

  useEffect(()=>{ fetchCariler(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveCari = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/cari?cariId=${editingId}` : "/api/cari";

      const res = await fetch(url, {
        method,
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error("Kayıt hatası");

      await fetchCariler();
      resetForm();
      alert("✅ Kaydedildi");
    } catch(err) {
      alert("❌ Kayıt başarısız");
    }
    setLoading(false);
  };

  const editCari = (c) => {
    setEditingId(c._id);
    setForm({
      ad:c.ad,
      tur:c.tur,
      telefon:c.telefon,
      email:c.email,
      vergiTipi:c.vergiTipi,
      vergiNo:c.vergiNo,
      adres:c.adres,
      il:c.il,
      ilce:c.ilce,
      postaKodu:c.postaKodu,
      paraBirimi:c.paraBirimi,
      kdvOrani:c.kdvOrani,
      trendyolCustomerId:c.trendyolCustomerId || "",
      hbCustomerId:c.hbCustomerId || "",
    });
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const deleteCari = async (id) => {
    if (!confirm("Silinsin mi?")) return;
    const token = localStorage.getItem("token");
    await fetch(`/api/cari?cariId=${id}`, {
      method:"DELETE",
      headers:{ Authorization:`Bearer ${token}` }
    });
    fetchCariler();
  };

  const filtered = cariler.filter(c =>
    c.ad.toLowerCase().includes(filters.q.toLowerCase()) &&
    (filters.tur ? c.tur === filters.tur : true)
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-6 text-center">💼 Cari Yönetimi</h1>

      {/* FORM */}
      <form onSubmit={saveCari} className="bg-white p-6 rounded-xl shadow grid grid-cols-12 gap-4">

        <input className="input col-span-6" placeholder="Ad *" value={form.ad}
          onChange={(e)=>setForm({...form, ad:e.target.value})} required />

        <select className="input col-span-3" value={form.tur}
          onChange={(e)=>setForm({...form, tur:e.target.value})}>
          <option>Müşteri</option>
          <option>Tedarikçi</option>
        </select>

        <input className="input col-span-3" placeholder="Telefon" value={form.telefon}
          onChange={(e)=>setForm({...form, telefon:e.target.value})} />

        <input className="input col-span-6" placeholder="Email" value={form.email}
          onChange={(e)=>setForm({...form, email:e.target.value})} />

        <select className="input col-span-3" value={form.vergiTipi}
          onChange={(e)=>setForm({...form, vergiTipi:e.target.value})}>
          <option>TCKN</option>
          <option>VKN</option>
        </select>

        <input className="input col-span-3" placeholder="Vergi No" value={form.vergiNo}
          onChange={(e)=>setForm({...form, vergiNo:e.target.value})} />

        <input className="input col-span-4" placeholder="İl" value={form.il}
          onChange={(e)=>setForm({...form, il:e.target.value})} />

        <input className="input col-span-4" placeholder="İlçe" value={form.ilce}
          onChange={(e)=>setForm({...form, ilce:e.target.value})} />

        <input className="input col-span-4" placeholder="Posta Kodu" value={form.postaKodu}
          onChange={(e)=>setForm({...form, postaKodu:e.target.value})} />

        <textarea className="input col-span-12" placeholder="Adres"
          value={form.adres} onChange={(e)=>setForm({...form, adres:e.target.value})} />

        {/* ✅ Pazaryeri alanları */}
        <input className="input col-span-6" placeholder="Trendyol Müşteri ID"
          value={form.trendyolCustomerId}
          onChange={(e)=>setForm({...form, trendyolCustomerId:e.target.value})} />

        <input className="input col-span-6" placeholder="Hepsiburada Müşteri ID"
          value={form.hbCustomerId}
          onChange={(e)=>setForm({...form, hbCustomerId:e.target.value})} />

        <div className="col-span-12 flex justify-end gap-2">
          {editingId && <button type="button" className="btn-gray" onClick={resetForm}>İptal</button>}
          <button className="btn-primary">{editingId ? "Güncelle" : "Kaydet"}</button>
        </div>
      </form>

      {/* LİSTE */}
      <table className="w-full mt-6 bg-white rounded-xl shadow text-sm">
        <thead className="bg-orange-100">
          <tr>
            <th>#</th>
            <th>Ad</th>
            <th>Tür</th>
            <th>Telefon</th>
            <th>Vergi</th>
            <th>TY ID</th>
            <th>HB ID</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c,i)=>(
            <tr key={c._id} className="border-b hover:bg-slate-50">
              <td>{i+1}</td>
              <td>{c.ad}</td>
              <td>{c.tur}</td>
              <td>{c.telefon}</td>
              <td>{c.vergiTipi}:{c.vergiNo}</td>
              <td>{c.trendyolCustomerId || "-"}</td>
              <td>{c.hbCustomerId || "-"}</td>
              <td>
                <button className="text-blue-600" onClick={()=>editCari(c)}>✏️</button>
                <button className="text-red-600 ml-2" onClick={()=>deleteCari(c._id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
