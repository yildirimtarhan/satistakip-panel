import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function CariEkstresi() {
  const [cariler, setCariler] = useState([]);
  const [hareketler, setHareketler] = useState([]);
  const [cariId, setCariId] = useState("");
  const [cariInfo, setCariInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setCariler);
  }, []);

  const loadEkstre = async () => {
    if (!cariId) return alert("Cari seçin");
    const token = localStorage.getItem("token");

    const r = await fetch(`/api/cari/transactions?cariId=${cariId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await r.json();
    setHareketler(data);

    const cari = cariler.find(c => c._id === cariId);
    setCariInfo(cari);
  };

  const toExcel = () => {
    const ws = XLSX.utils.json_to_sheet(hareketler);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `cari-ekstresi-${cariInfo?.ad}.xlsx`);
  };

  // Geçici PDF: Print dialog → PDF
  const printPDF = () => window.print();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-orange-600 mb-4">📄 Cari Ekstresi</h2>

      <div className="flex gap-3 mb-4">
        <select className="border p-2 rounded" value={cariId} onChange={e => setCariId(e.target.value)}>
          <option value="">Cari Seç *</option>
          {cariler.map(c => <option key={c._id} value={c._id}>{c.ad}</option>)}
        </select>

        <button onClick={loadEkstre} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
          🔍 Göster
        </button>

        <button onClick={toExcel} className="px-4 py-2 bg-green-600 text-white rounded">
          📥 Excel
        </button>

        <button onClick={printPDF} className="px-4 py-2 bg-blue-600 text-white rounded">
          🖨️ PDF Yazdır
        </button>
      </div>

      {cariInfo && (
        <div className="mb-4 p-3 bg-white rounded shadow text-sm">
          <b>Cari:</b> {cariInfo.ad} <br/>
          <b>Telefon:</b> {cariInfo.telefon} <br/>
          <b>Mail:</b> {cariInfo.email}
        </div>
      )}

      <table className="w-full text-sm bg-white rounded shadow">
        <thead className="bg-orange-100">
          <tr>
            <th className="p-2 border">Tarih</th>
            <th className="p-2 border">Tür</th>
            <th className="p-2 border">Ürün</th>
            <th className="p-2 border">Miktar</th>
            <th className="p-2 border">Birim Fiyat</th>
            <th className="p-2 border">Tutar (TRY)</th>
          </tr>
        </thead>
        <tbody>
          {hareketler.map((h, i) => (
            <tr key={i}>
              <td className="border p-2">{new Date(h.date).toLocaleDateString()}</td>
              <td className="border p-2">{h.tur}</td>
              <td className="border p-2">{h.product}</td>
              <td className="border p-2">{h.quantity}</td>
              <td className="border p-2">{h.unitPrice}</td>
              <td className="border p-2">{h.totalTRY}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
