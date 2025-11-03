import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function CariEkstresi() {
  const [cariler, setCariler] = useState([]);
  const [seciliCariId, setSeciliCariId] = useState("");
  const [seciliCari, setSeciliCari] = useState(null);
  const [items, setItems] = useState([]);

  const [dateFrom, setDateFrom] = useState(() =>
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [typeFilter, setTypeFilter] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const logoInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // ✅ Login koruması
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "/auth/login";
  }, []);

  const tl = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

  // ✅ Cariler
  const fetchCariler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCariler(Array.isArray(data) ? data : []);
  };

  // ✅ Transactions
  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `/api/cari/transactions?start=${dateFrom}&end=${dateTo}&cari=${seciliCariId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCariler();
    fetchTransactions();
  }, []);

  useEffect(() => {
    const c = cariler.find((x) => x._id === seciliCariId);
    setSeciliCari(c || null);
  }, [seciliCariId, cariler]);

  // ✅ Filtre ve Türkçe tür
  const filtered = useMemo(() => {
    const start = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T23:59:59");

    return items
      .filter((it) => {
        const okCari = seciliCari ? it.accountId === seciliCari._id : true;
        const d = new Date(it.date || Date.now());
        const okDate = d >= start && d <= end;
        const okType = typeFilter
          ? String(it.type).toLowerCase() === typeFilter
          : true;
        return okCari && okDate && okType;
      })
      .map((t) => ({
        ...t,
        typeTR: t.type === "sale" ? "Satış" : t.type === "purchase" ? "Alış" : t.type,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [items, seciliCari, dateFrom, dateTo, typeFilter]);

  // ✅ Özet
  const summary = useMemo(() => {
    let borc = 0, alacak = 0;
    filtered.forEach((t) => {
      const tutar = Number(t.totalTRY ?? t.total ?? 0);
      if (t.type === "purchase") borc += tutar;
      if (t.type === "sale") alacak += tutar;
    });
    return { borc, alacak, bakiye: alacak - borc };
  }, [filtered]);

  // ✅ LOGO seç
  const handleLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // ✅ EXCEL IMPORT
  const importExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    for (let r of rows) {
      await fetch("/api/cari/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          accountId: seciliCariId,
          type: r.Tür === "Satış" ? "sale" : "purchase",
          date: r.Tarih,
          totalTRY: r.Tutar,
        }),
      });
    }
    alert("✅ Excel yüklendi");
    fetchTransactions();
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { Tarih: "", Tür: "Satış/Alış", Tutar: "" },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Şablon");
    XLSX.writeFile(wb, "cari-ekstre-sablon.xlsx");
  };

  // ✅ EXCEL Export
  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      Tarih: toDateOnly(t.date),
      Cari: seciliCari?.ad,
      Tür: t.typeTR,
      Miktar: t.quantity,
      "Birim Fiyat": t.unitPrice,
      PB: t.currency,
      Tutar: t.totalTRY,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, `cari-ekstre_${seciliCari?.ad}_${dateFrom}_${dateTo}.xlsx`);
  };

  // ✅ PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Cari Ekstresi", 14, 15);
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 150, 5, 50, 20);

    doc.autoTable({
      startY: 30,
      head: [["Tarih", "Tür", "Tutar"]],
      body: filtered.map((t) => [
        toDateOnly(t.date),
        t.typeTR,
        tl(t.totalTRY),
      ]),
    });

    doc.save(`cari-ekstre_${seciliCari?.ad}.pdf`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">📄 Cari Ekstresi</h1>

      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-12 gap-3">
        
        <select className="border p-2 rounded col-span-12 md:col-span-4"
          value={seciliCariId} onChange={(e) => setSeciliCariId(e.target.value)}>
          <option value="">Cari Seç</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>{c.ad}</option>
          ))}
        </select>

        <input type="date" className="border p-2 rounded col-span-6 md:col-span-2"
          value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />

        <input type="date" className="border p-2 rounded col-span-6 md:col-span-2"
          value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

        <button onClick={fetchTransactions} className="bg-orange-600 text-white col-span-6 md:col-span-2 rounded">🔍 Getir</button>
        <button onClick={exportPDF} className="bg-gray-700 text-white col-span-6 md:col-span-2 rounded">📄 PDF</button>
        <button onClick={exportExcel} className="bg-green-600 text-white col-span-6 md:col-span-2 rounded">📥 Excel</button>

        <button onClick={() => excelInputRef.current?.click()}
         className="bg-blue-600 text-white col-span-6 md:col-span-2 rounded">📤 Excel Yükle</button>
        <input ref={excelInputRef} type="file" hidden accept=".xlsx" onChange={(e)=>importExcel(e.target.files[0])} />

        <button onClick={downloadTemplate} className="bg-purple-600 text-white col-span-6 md:col-span-2 rounded">
          📎 Şablon
        </button>

        <button onClick={() => logoInputRef.current?.click()} className="border col-span-6 md:col-span-2 rounded">
          🖼️ Logo
        </button>
        <input ref={logoInputRef} hidden accept="image/*" type="file" onChange={handleLogoPick}/>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-12 gap-3">
        <SummaryCard title="Toplam Satış (TL)" value={tl(summary.alacak)} />
        <SummaryCard title="Toplam Alış (TL)" value={tl(summary.borc)} />
        <SummaryCard title="Bakiye (TL)" value={tl(summary.bakiye)} />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="p-2">Tarih</th>
              <th className="p-2">Tür</th>
              <th className="p-2 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{toDateOnly(t.date)}</td>
                <td className="p-2">{t.typeTR}</td>
                <td className="p-2 text-right">{tl(t.totalTRY)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white rounded-xl shadow p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
