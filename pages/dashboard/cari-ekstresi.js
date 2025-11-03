import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function CariEkstresi() {
  const fileRef = useRef(null);

  const [cariler, setCariler] = useState([]);
  const [seciliCariId, setSeciliCariId] = useState("");
  const [seciliCari, setSeciliCari] = useState(null);
  const [items, setItems] = useState([]);
  const [importRows, setImportRows] = useState([]);

  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchCariler();
  }, []);

  const fetchCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    setCariler(Array.isArray(data) ? data : []);
  };

  const fetchTransactions = async () => {
    if (!seciliCariId) return alert("Lütfen cari seçiniz ✅");

    const res = await fetch(
      `/api/cari/transactions?start=${dateFrom}&end=${dateTo}&cari=${seciliCariId}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const c = cariler.find((x) => x._id === seciliCariId);
    setSeciliCari(c || null);
  }, [seciliCariId, cariler]);

  const trType = (t) =>
    t === "sale" ? "Satış"
    : t === "purchase" ? "Alış"
    : t === "tahsilat" ? "Tahsilat"
    : t === "odeme" ? "Ödeme"
    : t;

  const filtered = useMemo(() => {
    const start = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T23:59:59");

    return items
      .filter((t) => {
        const d = new Date(t.date);
        const okDate = d >= start && d <= end;
        const okType = typeFilter ? t.type === typeFilter : true;
        return okDate && okType;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [items, dateFrom, dateTo, typeFilter]);

  const tl = (n) => Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const summary = useMemo(() => {
    let borc = 0,
      alacak = 0;

    filtered.forEach((t) => {
      const tutar = t.totalTRY ?? t.total ?? 0;
      if (t.type === "purchase") borc += tutar;
      else if (t.type === "sale") alacak += tutar;
    });

    return { borc, alacak, bakiye: alacak - borc };
  }, [filtered]);

  // ✅ PDF Export Fix
  const exportPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");
    doc.text("Cari Ekstresi", 40, 40);
    doc.text(`Cari: ${seciliCari?.ad}`, 40, 60);
    doc.text(`Tarih: ${dateFrom} - ${dateTo}`, 40, 80);

    doc.autoTable({
      startY: 100,
      head: [["Tarih", "Açıklama", "Tür", "Tutar (TL)"]],
      body: filtered.map((t) => [
        new Date(t.date).toLocaleDateString("tr-TR"),
        t.product || "-",
        trType(t.type),
        tl(t.totalTRY ?? t.total ?? 0),
      ]),
    });

    doc.save(`cari-ekstre_${seciliCari?.ad}.pdf`);
  };

  // ✅ Excel Export
  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      Tarih: new Date(t.date).toLocaleDateString("tr-TR"),
      İşlem: trType(t.type),
      Ürün: t.product || "-",
      TutarTL: t.totalTRY ?? t.total ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, "cari-ekstre.xlsx");
  };

  // ✅ Excel Import
  const importExcel = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = XLSX.read(evt.target.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]);

      for (let r of json) {
        await fetch("/api/cari/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            accountId: seciliCariId,
            type: r.Tür?.toLowerCase() === "satış" ? "sale" : "purchase",
            totalTRY: r.TutarTL,
            unitPrice: r.TutarTL,
            quantity: 1,
            product: r.Açıklama || "-",
          }),
        });
      }

      alert("✅ Cari ekstresi içe aktarıldı");
      fetchTransactions();
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 Cari Ekstresi
      </h1>

      {/* Filtre */}
      <div className="bg-white p-4 rounded-xl shadow grid grid-cols-12 gap-3">
        <select
          className="input col-span-4"
          value={seciliCariId}
          onChange={(e) => setSeciliCariId(e.target.value)}
        >
          <option value="">Cari Seç</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>{c.ad}</option>
          ))}
        </select>

        <input type="date" className="input col-span-3" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" className="input col-span-3" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

        <button onClick={fetchTransactions} className="btn-primary col-span-2">🔍 Getir</button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-12 gap-4">
        <Card title="Toplam Satış" value={tl(summary.alacak)} color="green" />
        <Card title="Toplam Alış" value={tl(summary.borc)} color="red" />
        <Card title="Bakiye" value={tl(summary.bakiye)} color={summary.bakiye >= 0 ? "green" : "red"} />
      </div>

      {/* İşlem Butonları */}
      <div className="flex gap-2">
        <button className="btn-gray" onClick={exportExcel}>📥 Excel</button>
        <button className="btn-gray" onClick={exportPDF}>📄 PDF</button>

        <button className="btn-primary" onClick={() => fileRef.current.click()}>
          📂 Excel İçeri Al
        </button>
        <input type="file" ref={fileRef} className="hidden" onChange={importExcel} />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th>Tarih</th>
              <th>Açıklama</th>
              <th>Tür</th>
              <th>Tutar (TL)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="border-b hover:bg-slate-50">
                <td>{new Date(t.date).toLocaleDateString("tr-TR")}</td>
                <td>{t.product}</td>
                <td>{trType(t.type)}</td>
                <td>{tl(t.totalTRY ?? t.total ?? 0)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center p-3 text-gray-500">Kayıt yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="col-span-4 bg-white rounded-xl shadow p-4 text-center">
      <p className="text-gray-500 text-xs">{title}</p>
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
    </div>
  );
}
