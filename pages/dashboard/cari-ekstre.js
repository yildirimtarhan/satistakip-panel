import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Cookies from "js-cookie";
import { registerFont } from "@/utils/pdfFont";

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v).trim();
  if (!s) return 0;

  // ₺, boşluk vs temizle
  s = s.replaceAll("₺", "").replace(/\s/g, "");

  // TR format: 2.000,00 -> 2000.00
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // 2.000 -> 2000 (binlik ayırıcı olabilir)
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const tl = (v) =>
  toNumber(v).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("tr-TR");
};

// API farklı alanlarla dönse bile tek formata sok
const normalizeRow = (r) => ({
  tarih: r.tarih || r.date || r.createdAt || r.at || null,
  aciklama: r.aciklama || r.description || r.note || r.title || "-",
  borc: r.borc ?? r.debit ?? 0,
  alacak: r.alacak ?? r.credit ?? 0,
  bakiye: r.bakiye ?? r.balance ?? 0,
});

export default function CariEkstrePage() {
  const [token, setToken] = useState("");
  const [cariler, setCariler] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState([]);
  const openPDF = () => {
  const token =
    Cookies.get("token") || localStorage.getItem("token") || "";

  const url = `/api/cari/ekstre-pdf?accountId=${accountId}&start=${dateFrom}&end=${dateTo}`;

  window.open(url, "_blank", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};


  // date input: YYYY-MM-DD
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(isoToday);

  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);

    const fetchCariler = async () => {
      try {
        const res = await fetch("/api/cari", {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cariler || [];
        setCariler(list);

        if (list.length && !accountId) setAccountId(list[0]._id);
      } catch (e) {
        console.error("Cariler alınamadı:", e);
      }
    };

    fetchCariler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seciliCari = useMemo(
    () => cariler.find((c) => c._id === accountId) || null,
    [cariler, accountId]
  );

  const computedRows = useMemo(() => rows.map(normalizeRow), [rows]);

  const toplamBorc = useMemo(
    () => computedRows.reduce((a, r) => a + toNumber(r.borc), 0),
    [computedRows]
  );
  const toplamAlacak = useMemo(
    () => computedRows.reduce((a, r) => a + toNumber(r.alacak), 0),
    [computedRows]
  );
  const sonBakiye = useMemo(() => {
    if (!computedRows.length) return 0;
    return toNumber(computedRows[computedRows.length - 1].bakiye);
  }, [computedRows]);

  const fetchEkstre = async () => {
    if (!accountId) return;

    try {
      const qs = new URLSearchParams({
        accountId,
        start: dateFrom,
        end: dateTo,
      });

      const res = await fetch(`/api/cari/ekstre?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      // esnek okuma
      const list =
        data?.rows ||
        data?.transactions ||
        data?.items ||
        (Array.isArray(data) ? data : []);

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Ekstre alınamadı:", e);
      setRows([]);
    }
  };

  const exportExcel = () => {
    const out = computedRows.map((r) => ({
      Tarih: fmtDate(r.tarih),
      Açıklama: r.aciklama || "-",
      Borç: toNumber(r.borc),
      Alacak: toNumber(r.alacak),
      Bakiye: toNumber(r.bakiye),
    }));

    // toplam satırı
    out.push({
      Tarih: "",
      Açıklama: "TOPLAM",
      Borç: toplamBorc,
      Alacak: toplamAlacak,
      Bakiye: sonBakiye,
    });

    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cari Ekstresi");

    XLSX.writeFile(
      wb,
      `cari-ekstre_${(seciliCari?.ad || "cari").replaceAll(" ", "_")}.xlsx`
    );
  };

  const exportPDF = async () => {
  try {
    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const autoTable = autoTableMod.default || autoTableMod;
    const doc = new jsPDF("p", "pt", "a4");

    // Başlık
    doc.setFontSize(14);
    doc.text("Cari Ekstresi", 40, 40);

    doc.setFontSize(11);
    doc.text(`Cari: ${seciliCari?.ad || ""}`, 40, 60);
    doc.text(`Tarih Aralığı: ${dateFrom} - ${dateTo}`, 40, 78);

    const body = [
      ...rows.map((r) => [
        fmtDate(r.tarih),
        r.aciklama || "-",
        tl(r.borc),
        tl(r.alacak),
        tl(r.bakiye),
      ]),
      ["", "TOPLAM", tl(toplamBorc), tl(toplamAlacak), tl(sonBakiye)],
    ];

    autoTable(doc, {
      startY: 100,
      head: [["Tarih", "Açıklama", "Borç", "Alacak", "Bakiye"]],
      body,

      styles: {
        fontSize: 10,
        cellPadding: 6,
        overflow: "linebreak",
        halign: "right",
      },

      headStyles: {
        halign: "center",
      },

      columnStyles: {
        0: { halign: "center", cellWidth: 80 },
        1: { halign: "left", cellWidth: 200 },
        2: { halign: "right", cellWidth: 80 },
        3: { halign: "right", cellWidth: 80 },
        4: { halign: "right", cellWidth: 80 },
      },

      margin: { left: 40, right: 40 },
    });

    doc.save(`cari-ekstre-${seciliCari?.ad || "cari"}.pdf`);
  } catch (err) {
    console.error("PDF oluşturma hatası:", err);
    alert("PDF oluşturulamadı. Konsolu kontrol et.");
  }
};


  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📄 Cari Ekstresi</h1>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-end bg-white border rounded p-3 mb-4">
        <div className="min-w-[280px]">
          <label className="text-xs text-gray-500">Cari</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {cariler.map((c) => (
              <option key={c._id} value={c._id}>
                {c.ad}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Başlangıç</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Bitiş</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <button
          onClick={fetchEkstre}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          🔍 Getir
        </button>
      </div>

      {/* Özet */}
      <div className="bg-white border rounded p-4 mb-3">
        <div className="text-sm text-gray-500 text-center">Bakiye</div>
        <div className="text-2xl font-bold text-center">{tl(sonBakiye)}</div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={exportExcel}
          className="bg-gray-100 border px-4 py-2 rounded"
          disabled={!computedRows.length}
        >
          📥 Excel
        </button>

        <button
  onClick={openPDF}
  className="bg-gray-100 border px-4 py-2 rounded"
  disabled={!rows.length}
>
  🧾 PDF
</button>

      </div>

      {/* Tablo */}
      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="text-left p-2">Tarih</th>
              <th className="text-left p-2">Açıklama</th>
              <th className="text-right p-2">Borç</th>
              <th className="text-right p-2">Alacak</th>
              <th className="text-right p-2">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {computedRows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{fmtDate(r.tarih)}</td>
                <td className="p-2">{r.aciklama || "-"}</td>
                <td className="p-2 text-right">{tl(r.borc)}</td>
                <td className="p-2 text-right">{tl(r.alacak)}</td>
                <td className="p-2 text-right font-medium">{tl(r.bakiye)}</td>
              </tr>
            ))}

            {!!computedRows.length && (
              <tr className="border-t bg-orange-50">
                <td className="p-2 font-bold" colSpan={2}>
                  TOPLAM
                </td>
                <td className="p-2 text-right font-bold text-red-600">
                  {tl(toplamBorc)}
                </td>
                <td className="p-2 text-right font-bold text-green-600">
                  {tl(toplamAlacak)}
                </td>
                <td className="p-2 text-right font-bold">{tl(sonBakiye)}</td>
              </tr>
            )}

            {!computedRows.length && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
