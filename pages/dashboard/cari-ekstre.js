import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { registerFont } from "@/utils/pdfFont";


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
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

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

    setRows([]);
    setBakiye(0);

    try {
      const res = await fetch(
        `/api/cari/ekstre?accountId=${seciliCariId}&start=${dateFrom}&end=${dateTo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );

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
  // 🔥 jsPDF ve autoTable birlikte import
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF("p", "pt", "a4");

  registerFont(doc); // ✅ TÜRKÇE FONT

  doc.setFont("DejaVu");
doc.setFontSize(14);
doc.text(
  `Cari Ekstresi – ${seciliCari?.ad || ""}`,
  40,
  40
);

doc.setFontSize(11);
doc.text(
  `Tarih Aralığı: ${dateFrom} - ${dateTo}`,
  40,
  60
);


  autoTable(doc, {
  startY: 80,
  head: [["Tarih", "Açıklama", "Borç", "Alacak", "Bakiye"]],
  body: rows.map((r) => [
    r?.tarih ? new Date(r.tarih).toLocaleDateString("tr-TR") : "-",
    r?.aciklama || "-",
    tl(r?.borc || 0),
    tl(r?.alacak || 0),
    tl(r?.bakiye || 0),
  ]),
  styles: {
    font: "DejaVu",
    fontSize: 10,
    halign: "right",
  },
  headStyles: {
    font: "DejaVu",
    halign: "center",
    fillColor: [255, 153, 0],
  },
  columnStyles: {
    0: { halign: "center" },
    1: { halign: "left" },
  },
  margin: { left: 40, right: 40 },
});

  doc.save(`cari-ekstre_${seciliCari?.ad || "cari"}.pdf`);
};


  const exportExcel = () => {
    const excelRows = rows.map((r) => ({
      Tarih: r.tarih ? new Date(r.tarih).toLocaleDateString("tr-TR") : "-",
      Açıklama: r.aciklama || "-",
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

        <button onClick={fetchEkstre} className="btn-primary col-span-2">
          🔍 Getir
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card title="Bakiye" value={tl(bakiye)} />
      </div>

      <div className="flex gap-2">
        <button className="btn-gray" onClick={exportExcel}>
          📥 Excel
        </button>
        <button className="btn-gray" onClick={exportPDF}>
          📄 PDF
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Açıklama</th>
              <th className="px-3 py-2 text-right">Borç</th>
              <th className="px-3 py-2 text-right">Alacak</th>
              <th className="px-3 py-2 text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row._id || i} className="border-b">
                <td className="px-3 py-2">
                  {row.tarih
                    ? new Date(row.tarih).toLocaleDateString("tr-TR")
                    : "-"}
                </td>
                <td className="px-3 py-2">{row.aciklama || "-"}</td>
                <td className="px-3 py-2 text-right">{tl(row.borc)}</td>
                <td className="px-3 py-2 text-right">{tl(row.alacak)}</td>
                <td className="px-3 py-2 text-right font-bold">
                  {tl(row.bakiye)}
                </td>
              </tr>
            ))}
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
