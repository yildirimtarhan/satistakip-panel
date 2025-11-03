// 📄 /pages/dashboard/cariler.js
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Link from "next/link";

export default function Cariler() {
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [cariler, setCariler] = useState([]);
  const [activeTab, setActiveTab] = useState("form");
  const [detail, setDetail] = useState(null); // ✅ Cari detay modal

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
    trendyolCustomerId:"",
    hbCustomerId:""
  };

  const [form, setForm] = useState(emptyForm);

  const fetchCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization:`Bearer ${localStorage.getItem("token")}` }
    });
    setCariler(await res.json());
  };

  useEffect(()=>{ fetchCariler(); }, []);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const saveCari = async (e) => {
    e.preventDefault();
    setLoading(true);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/cari?cariId=${editingId}` : "/api/cari";

    await fetch(url, {
      method,
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify(form)
    });

    fetchCariler();
    resetForm();
    alert("✅ Kaydedildi");
    setLoading(false);
  };

  const deleteCari = async (id) => {
    if (!confirm("Bu cariyi silmek istediğine emin misin?")) return;
    await fetch(`/api/cari?cariId=${id}`, {
      method:"DELETE",
      headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
    });
    fetchCariler();
    alert("🗑️ Cari silindi");
  };

  // ✅ Excel Export
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cariler);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cariler");
    const excelBuffer = XLSX.write(wb, { bookType:"xlsx", type:"array" });
    saveAs(new Blob([excelBuffer]), "cariler.xlsx");
  };

  // ✅ Excel Import
  const importExcel = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = XLSX.read(evt.target.result, { type:"binary" });
      const json = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]);

      for (let row of json) {
        await fetch("/api/cari", {
          method:"POST",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify({ ...emptyForm, ...row })
        });
      }

      alert("✅ Excel'den cariler yüklendi");
      fetchCariler();
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">💼 Cari Yönetimi</h1>

      {/* ✅ Tabs */}
      <div className="flex gap-2 mb-3">
        {["form","liste","excel"].map(t=>(
          <button key={t}
            className={`px-4 py-2 rounded ${activeTab===t?"bg-orange-500 text-white":"bg-gray-200"}`}
            onClick={()=>setActiveTab(t)}>
            {t==="form" && "➕ Yeni / Düzenle"}
            {t==="liste" && "📋 Cari Listesi"}
            {t==="excel" && "📂 Excel İşlemleri"}
          </button>
        ))}
      </div>

      {/* ✅ FORM */}
      {activeTab==="form" && (
        <form onSubmit={saveCari} className="bg-white p-6 rounded-xl shadow grid grid-cols-12 gap-4">

          <input className="input col-span-6" placeholder="Ad *" value={form.ad}
            onChange={(e)=>setForm({...form, ad:e.target.value})} required />

          <select className="input col-span-3" value={form.tur}
            onChange={(e)=>setForm({...form, tur:e.target.value})}>
            <option>Müşteri</option><option>Tedarikçi</option>
          </select>

          <input className="input col-span-3" placeholder="Telefon" value={form.telefon}
            onChange={(e)=>setForm({...form, telefon:e.target.value})} />

          <input className="input col-span-6" placeholder="Email" value={form.email}
            onChange={(e)=>setForm({...form, email:e.target.value})} />

          <select className="input col-span-3" value={form.vergiTipi}
            onChange={(e)=>setForm({...form, vergiTipi:e.target.value})}>
            <option>TCKN</option><option>VKN</option>
          </select>

          <input className="input col-span-3" placeholder="Vergi No" value={form.vergiNo}
            onChange={(e)=>setForm({...form, vergiNo:e.target.value})} />

          <input className="input col-span-4" placeholder="İl" value={form.il}
            onChange={(e)=>setForm({...form, il:e.target.value})}/>

          <input className="input col-span-4" placeholder="İlçe" value={form.ilce}
            onChange={(e)=>setForm({...form, ilce:e.target.value})}/>

          <input className="input col-span-4" placeholder="Posta Kodu" value={form.postaKodu}
            onChange={(e)=>setForm({...form, postaKodu:e.target.value})}/>

          <textarea className="input col-span-12" placeholder="Adres"
            value={form.adres} onChange={(e)=>setForm({...form, adres:e.target.value})} />

          <input className="input col-span-6" placeholder="🛒 Trendyol Müşteri ID"
            value={form.trendyolCustomerId}
            onChange={(e)=>setForm({...form, trendyolCustomerId:e.target.value})} />

          <input className="input col-span-6" placeholder="🏬 Hepsiburada Müşteri ID"
            value={form.hbCustomerId}
            onChange={(e)=>setForm({...form, hbCustomerId:e.target.value})} />

          <div className="col-span-12 flex justify-end gap-2">
            {editingId && <button type="button" className="btn-gray" onClick={resetForm}>İptal</button>}
            <button className="btn-primary">{editingId ? "Güncelle" : "Kaydet"}</button>
          </div>
        </form>
      )}

      {/* ✅ LIST */}
      {activeTab==="liste" && (
        <table className="w-full bg-white rounded-xl shadow text-sm">
          <thead className="bg-orange-100"><tr>
            <th>#</th><th>Ad</th><th>Tür</th><th>Telefon</th><th>Vergi</th>
            <th>Trendyol</th><th>HB</th><th>Bakiye</th><th>İşlem</th>
          </tr></thead>
          <tbody>
            {cariler.map((c,i)=>(
              <tr key={c._id} className="border-b hover:bg-slate-50">
                <td>{i+1}</td>
                <td>{c.ad}</td>
                <td>{c.tur}</td>
                <td>
                  {c.telefon}{" "}
                  <a href={`https://wa.me/90${c.telefon}`} target="_blank" className="text-green-600">WhatsApp</a>
                </td>
                <td>{c.vergiTipi}:{c.vergiNo}</td>
                <td>{c.trendyolCustomerId || "-"}</td>
                <td>{c.hbCustomerId || "-"}</td>
                <td className={`font-bold ${c.bakiye>0?"text-green-600":"text-red-600"}`}>
                  ₺{(c.bakiye||0).toLocaleString("tr-TR")}
                </td>
                <td className="flex gap-2">
                  <button className="text-blue-600" 
                    onClick={()=>{setForm(c); setEditingId(c._id); setActiveTab("form")}}>✏️</button>

                  <Link href={`/dashboard/cari-ekstre?cariId=${c._id}`} className="text-orange-600">📄</Link>

                  <button className="text-red-600" onClick={()=>deleteCari(c._id)}>🗑️</button>

                  <button className="text-purple-600" onClick={()=>setDetail(c)}>ℹ️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ Excel */}
      {activeTab==="excel" && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4 text-center">
          <button onClick={exportExcel} className="btn-primary">📤 Excel Dışa Aktar</button>
          <input type="file" ref={fileRef} className="hidden" onChange={importExcel}/>
          <button onClick={()=>fileRef.current.click()} className="btn-gray">📥 Excel İçeri Al</button>
        </div>
      )}

      {/* ✅ Cari Detay Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg space-y-2">
            <h2 className="font-bold text-lg">👤 {detail.ad}</h2>
            <p>Tel: {detail.telefon}</p>
            <p>Email: {detail.email}</p>
            <p>Adres: {detail.adres}</p>

            <div className="flex gap-2 mt-4">
              <Link href={`/dashboard/cari-ekstre?cariId=${detail._id}`} className="btn-primary w-full text-center">
                📄 Ekstre
              </Link>
              <button className="btn-gray w-full" onClick={()=>setDetail(null)}>Kapat</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
