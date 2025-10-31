import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Teklifler() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [lines, setLines] = useState([{ urunId:"", adet:1, fiyat:0 }]);
  const [cariId, setCariId] = useState("");
  const [not, setNot] = useState("");
  const [logo, setLogo] = useState(null);
  const logoRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/cari",{ headers:{Authorization:`Bearer ${token}`} }).then(r=>r.json()).then(setCariler);
    fetch("/api/urunler",{ headers:{Authorization:`Bearer ${token}`} }).then(r=>r.json()).then(setUrunler);
  }, []);

  const toplam = lines.reduce((t, l) => t + (Number(l.adet||0) * Number(l.fiyat||0)), 0);

  const addLine = () => setLines([...lines,{ urunId:"", adet:1, fiyat:0 }]);
  const removeLine = (i) => setLines(lines.filter((_,x)=>x!==i));
  const updateLine = (i, field, v) => {
    const copy = [...lines];
    copy[i][field] = v;
    if(field==="urunId"){
      const u = urunler.find(x=>x._id===v);
      if(u) copy[i].fiyat = u.satisFiyati;
    }
    setLines(copy);
  };

  const pickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ()=>setLogo(r.result);
    r.readAsDataURL(f);
  };

  const pdfOlustur = () => {
    const cari = cariler.find(c=>c._id===cariId);
    const doc = new jsPDF();

    if (logo) doc.addImage(logo, "PNG", 15, 10, 40, 40);

    doc.setFontSize(16).text("TEKLİF FORMU", 105, 20, { align:"center" });
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date().toLocaleDateString()}`, 150, 35);

    doc.text("Firma Bilgileri:", 15, 60);
    doc.text("SatışTakip / Kurumsal Tedarikçi", 15, 70);
    doc.text("www.satistakip.online", 15, 80);

    doc.text("Müşteri Bilgileri:", 120, 60);
    doc.text(cari?.ad || "-", 120, 70);
    doc.text(cari?.telefon || "-", 120, 80);

    const rows = lines.map((l,i)=>{
      const u = urunler.find(x=>x._id===l.urunId);
      return [
        i+1,
        u?.ad || "",
        l.adet,
        Number(l.fiyat).toLocaleString(),
        (l.adet*l.fiyat).toLocaleString()
      ];
    });

    doc.autoTable({
      startY: 100,
      head:[["#", "Ürün", "Adet", "Birim Fiyat", "Tutar"]],
      body: rows,
      headStyles:{ fillColor:[255,150,0] }
    });

    doc.text(`Genel Toplam: ${toplam.toLocaleString()} TL`, 150, doc.lastAutoTable.finalY + 10);

    if(not) {
      doc.text("Not:", 15, doc.lastAutoTable.finalY + 20);
      doc.text(not, 15, doc.lastAutoTable.finalY + 30);
    }

    doc.save(`Teklif-${cari?.ad || "musteri"}.pdf`);
  };

  return (
    <div className="p-6 space-y-4">

      <h1 className="text-xl font-bold text-orange-600">📄 Teklif Oluştur</h1>

      <div className="bg-white rounded-xl p-4 shadow border border-gray-100 space-y-3">

        <select className="border p-2 rounded w-full" value={cariId} onChange={(e)=>setCariId(e.target.value)}>
          <option value="">Cari Seç *</option>
          {cariler.map(c=> <option key={c._id} value={c._id}>{c.ad}</option>)}
        </select>

        {lines.map((l,i)=>(
          <div key={i} className="grid grid-cols-12 gap-2">
            <select className="border p-2 rounded col-span-5" value={l.urunId}
              onChange={(e)=>updateLine(i,"urunId",e.target.value)}>
              <option value="">Ürün seç</option>
              {urunler.map(u=> <option key={u._id} value={u._id}>{u.ad}</option>)}
            </select>
            <input className="border p-2 rounded col-span-2" type="number" placeholder="Adet"
              value={l.adet} onChange={(e)=>updateLine(i,"adet",e.target.value)}/>
            <input className="border p-2 rounded col-span-3" type="number" placeholder="Fiyat"
              value={l.fiyat} onChange={(e)=>updateLine(i,"fiyat",e.target.value)}/>
            <button onClick={()=>removeLine(i)} className="col-span-2 text-red-600">✖</button>
          </div>
        ))}

        <button className="bg-slate-200 px-3 py-1 rounded" onClick={addLine}>+ Satır Ekle</button>

        <textarea className="border p-2 rounded w-full" placeholder="Not" value={not} onChange={(e)=>setNot(e.target.value)} />

        <div className="flex gap-2">
          <button onClick={()=>logoRef.current.click()} className="border rounded px-3">🖼️ Logo Ekle</button>
          <input ref={logoRef} type="file" hidden onChange={pickLogo}/>
          <button onClick={pdfOlustur} className="bg-orange-600 text-white px-4 py-2 rounded">
            📎 PDF Oluştur
          </button>
        </div>

        <div className="text-right font-bold text-lg">
          Toplam: {toplam.toLocaleString()} TL
        </div>

      </div>
    </div>
  );
}
