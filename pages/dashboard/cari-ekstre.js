// 📁 /pages/dashboard/cari-ekstre.js
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";


export default function CariEkstresi() {
  const [cariler, setCariler] = useState([]);
  const [seciliCariId, setSeciliCariId] = useState("");
  const [seciliCari, setSeciliCari] = useState(null);

  const [rows, setRows] = useState([]);
  const [bakiye, setBakiye] = useState(0);

  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  useEffect(() => {
    fetchCariler();
  }, []);

  const fetchCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCariler(Array.isArray(data) ? data : []);
  };

  const fetchEkstre = async () => {
  if (!seciliCariId) {
    alert("Lütfen cari seçiniz");
    return;
  }

  // 🔥 state temizle (önemli)
  setRows([]);
  setBakiye(0);

  try {
    const res = await fetch(
      `/api/cari/ekstre?accountId=${seciliCariId}&start=${dateFrom}&end=${dateTo}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );

    if (!res.ok) {
      console.error("Ekstre fetch hatası:", res.status);
      return;
    }

    const data = await res.json();
    if (data.success) {
      setRows(data.rows || []);
      setBakiye(data.bakiye || 0);
    }
  } catch (err) {
    console.error("Ekstre alınamadı:", err);
  }
};

  useEffect(() => {
    const c = cariler.find((x) => x._id === seciliCariId);
    setSeciliCari(c || null);
  }, [seciliCariId, cariler]);

  const tl = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const exportPDF = async () => {
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("p", "pt", "a4");

  doc.text("Cari Ekstresi", 40, 40);
  doc.text(`Cari: ${seciliCari?.ad || "-"}`, 40, 60);
  doc.text(`Tarih: ${dateFrom} - ${dateTo}`, 40, 80);

  autoTable(doc, {
    startY: 100,
    head: [["Tarih", "Açıklama", "Borç", "Alacak", "Bakiye"]],
    body: rows.map((r) => [
      new Date(r.date).toLocaleDateString("tr-TR"),
      r.description || "-",
      (r.borc ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }),
      (r.alacak ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }),
      (r.bakiye ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }),
    ]),
  });

  doc.save(`cari-ekstre_${seciliCari?.ad || "cari"}.pdf`);
};

  const exportExcel = () => {
    const excelRows = rows.map((r) => ({
      Tarih: new Date(r.date).toLocaleDateString("tr-TR"),
      Açıklama: r.description || "-",
      Borç: r.borc,
      Alacak: r.alacak,
      Bakiye: r.bakiye,
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, "cari-ekstre.xlsx");
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
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="input col-span-3"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="input col-span-3"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <button
          onClick={fetchEkstre}
          className="btn-primary col-span-2"
        >
          🔍 Getir
        </button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-12 gap-4">
        <Card title="Bakiye" value={tl(bakiye)} />
      </div>

      {/* İşlem Butonları */}
      <div className="flex gap-2">
        <button className="btn-gray" onClick={exportExcel}>
          📥 Excel
        </button>
        <button className="btn-gray" onClick={exportPDF}>
          📄 PDF
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th>Tarih</th>
              <th>Açıklama</th>
              <th>Borç</th>
              <th>Alacak</th>
              <th>Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-slate-50">
                <td>{new Date(r.date).toLocaleDateString("tr-TR")}</td>
                <td>{r.description}</td>
                <td>{tl(r.borc)}</td>
                <td>{tl(r.alacak)}</td>
                <td>{tl(r.bakiye)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-3 text-gray-500"
                >
                  Kayıt yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="col-span-12 bg-white rounded-xl shadow p-4 text-center">
      <p className="text-gray-500 text-xs">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
