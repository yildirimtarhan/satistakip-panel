"use client";

// ✅ /pages/dashboard/cari-ekstre.js
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";
import * as XLSX from "xlsx";

export default function CariEkstrePage() {
  const [token, setToken] = useState("");

  const [cariler, setCariler] = useState([]);
  const [accountId, setAccountId] = useState("");

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const defaultFromISO = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [dateFrom, setDateFrom] = useState(defaultFromISO);
  const [dateTo, setDateTo] = useState(todayISO);

  const [rows, setRows] = useState([]);
  const [bakiye, setBakiye] = useState(0);
  const [loading, setLoading] = useState(false);

  const seciliCari = useMemo(
    () => cariler.find((c) => String(c._id) === String(accountId)),
    [cariler, accountId]
  );

  const tl = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("tr-TR") : "-");

  // ✅ TOPLAMLAR
  const toplamBorc = useMemo(
    () => rows.reduce((s, r) => s + Number(r?.borc || 0), 0),
    [rows]
  );
  const toplamAlacak = useMemo(
    () => rows.reduce((s, r) => s + Number(r?.alacak || 0), 0),
    [rows]
  );
  const sonBakiye = useMemo(() => {
    if (!rows.length) return Number(bakiye || 0);
    const last = rows[rows.length - 1];
    return Number(last?.bakiye ?? bakiye ?? 0);
  }, [rows, bakiye]);

  // ✅ TOKEN + CARİLERİ ÇEK
  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token") || "";
    setToken(t);

    const loadCariler = async () => {
      try {
        const res = await fetch("/api/cari", {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });

        if (!res.ok) throw new Error("Cari listesi alınamadı");

        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cariler || [];

        setCariler(list);

        // 🔑 İlk cari otomatik seç
        if (list.length > 0) setAccountId((prev) => prev || list[0]._id);
      } catch (e) {
        console.error("Cariler alınamadı:", e);
        setCariler([]);
      }
    };

    loadCariler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ EKSTRE GETİR
  const fetchEkstre = async () => {
    if (!accountId || !dateFrom || !dateTo) {
      alert("Cari ve tarih aralığı seçmelisin.");
      return;
    }

    setLoading(true);
    setRows([]);
    setBakiye(0);

    try {
      const url = `/api/cari/ekstre?accountId=${accountId}&start=${dateFrom}&end=${dateTo}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Ekstre API hata:", data);
        alert(data?.message || "Ekstre getirilemedi");
        return;
      }

      // Beklenen format: { success:true, rows:[...], bakiye:number }
      const newRows = Array.isArray(data) ? data : data?.rows || [];
      setRows(newRows);

      const b = Array.isArray(data) ? 0 : Number(data?.bakiye || 0);
      setBakiye(b);
    } catch (e) {
      console.error("Ekstre getirilemedi:", e);
      alert("Ekstre getirilemedi");
    } finally {
      setLoading(false);
    }
  };

  // ✅ EXCEL
  const exportExcel = () => {
    if (!rows.length) return;

    const excelRows = rows.map((r) => ({
      Tarih: fmtDate(r.tarih),
      Açıklama: r.aciklama || "-",
      Borç: Number(r.borc || 0),
      Alacak: Number(r.alacak || 0),
      Bakiye: Number(r.bakiye || 0),
    }));

    // Toplam satırı
    excelRows.push({
      Tarih: "",
      Açıklama: "TOPLAM",
      Borç: Number(toplamBorc.toFixed(2)),
      Alacak: Number(toplamAlacak.toFixed(2)),
      Bakiye: Number(sonBakiye.toFixed(2)),
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");

    const fileName = `cari-ekstre_${(seciliCari?.ad || "cari").replaceAll(
      " ",
      "_"
    )}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  /**
   * ✅ PDF (SERVER SIDE) - TOKEN'LI AÇ
   * Not: window.open() header gönderemez. Bu yüzden fetch ile PDF alıp blob açıyoruz.
   */
  const openPDF = async () => {
    if (!accountId) return;
    try {
      const url = `/api/cari/ekstre-pdf?accountId=${accountId}&start=${dateFrom}&end=${dateTo}`;

      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("PDF API hata:", err);
        alert(err?.message || "PDF oluşturulamadı. Konsolu kontrol et.");
        return;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      // İstersen 30 sn sonra revoke edebilirsin:
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
    } catch (e) {
      console.error("PDF açılamadı:", e);
      alert("PDF oluşturulamadı. Konsolu kontrol et.");
    }
  };

  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-orange-600 mb-4">
          Cari Ekstresi
        </h1>

        {/* Filtre */}
        <div className="bg-white border rounded p-4 mb-4">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <label className="block text-sm text-gray-600 mb-1">Cari</label>
              <select
                className="w-full border rounded p-2"
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

            <div className="col-span-3">
              <label className="block text-sm text-gray-600 mb-1">
                Başlangıç
              </label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-sm text-gray-600 mb-1">Bitiş</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="col-span-1">
              <button
                onClick={fetchEkstre}
                className="w-full bg-orange-500 text-white rounded p-2"
                disabled={loading}
                title="Getir"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Özet */}
          <div className="mt-4 p-3 bg-gray-50 border rounded text-center">
            <div className="text-gray-600 text-sm">Bakiye</div>
            <div className="text-xl font-bold">{tl(sonBakiye)}</div>
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={exportExcel}
            className="bg-gray-100 border px-4 py-2 rounded"
            disabled={!rows.length}
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
              {rows.map((r, i) => (
                <tr key={r?._id || i} className="border-t">
                  <td className="p-2">{fmtDate(r.tarih)}</td>
                  <td className="p-2">{r.aciklama || "-"}</td>
                  <td className="p-2 text-right">{tl(r.borc)}</td>
                  <td className="p-2 text-right">{tl(r.alacak)}</td>
                  <td className="p-2 text-right font-medium">{tl(r.bakiye)}</td>
                </tr>
              ))}

              {!!rows.length && (
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

              {!rows.length && (
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
    </RequireAuth>
  );
}
