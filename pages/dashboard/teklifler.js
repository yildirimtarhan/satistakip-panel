import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Teklifler() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);

  const [cariId, setCariId] = useState("");
  const [not, setNot] = useState("");
  const [logo, setLogo] = useState(null);

  const logoRef = useRef(null);
  const excelInRef = useRef(null);

  // Teklif satırları
  const [lines, setLines] = useState([
    { urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 },
  ]);

  // ───────────────────────────────────────────────────────────
  // DATA FETCH
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCariler(d));

    fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setUrunler(d));
  }, []);

  // ───────────────────────────────────────────────────────────
  // HELPERS
  const fmt = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const findUrunById = (id) => urunler.find((u) => u._id === id);
  const findUrunByName = (name) =>
    urunler.find((u) => (u.ad || "").toLowerCase() === (name || "").toLowerCase());

  // Toplamlar
  const araToplam = lines.reduce(
    (t, l) => t + Number(l.adet || 0) * Number(l.fiyat || 0),
    0
  );
  const kdvTutar = lines.reduce((t, l) => {
    const satir = Number(l.adet || 0) * Number(l.fiyat || 0);
    return t + (satir * Number(l.kdv || 0)) / 100;
  }, 0);
  const genelToplam = araToplam + kdvTutar;

  // ───────────────────────────────────────────────────────────
  // LINES MUTATIONS
  const addLine = () =>
    setLines((p) => [...p, { urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]);

  const removeLine = (i) => setLines((p) => p.filter((_, x) => x !== i));

  const updateLine = (i, field, val) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: val };

      // Ürün değişince otomatik fiyat doldur
      if (field === "urunId") {
        const u = findUrunById(val);
        copy[i].urunAd = u?.ad || "";
        if (u?.satisFiyati != null) copy[i].fiyat = Number(u.satisFiyati);
        if (u?.kdvOrani != null) copy[i].kdv = Number(u.kdvOrani);
      }

      if (field === "urunAd") {
        const u = findUrunByName(val);
        copy[i].urunId = u?._id || "";
        if (u?.satisFiyati != null) copy[i].fiyat = Number(u.satisFiyati);
        if (u?.kdvOrani != null) copy[i].kdv = Number(u.kdvOrani);
      }

      return copy;
    });
  };

  // ───────────────────────────────────────────────────────────
  // LOGO
  const pickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogo(r.result);
    r.readAsDataURL(f);
  };

  // ───────────────────────────────────────────────────────────
  // EXCEL EXPORT (teklif → xlsx)
  const exportExcel = () => {
    const rows = lines.map((l, i) => ({
      "#": i + 1,
      Ürün: l.urunAd || findUrunById(l.urunId)?.ad || "",
      Adet: Number(l.adet || 0),
      "Birim Fiyat": Number(l.fiyat || 0),
      "KDV %": Number(l.kdv || 0),
      "Tutar (KDV Hariç)": Number(l.adet || 0) * Number(l.fiyat || 0),
      "KDV Tutarı": ((Number(l.adet || 0) * Number(l.fiyat || 0)) * Number(l.kdv || 0)) / 100,
      "Tutar (KDV Dahil)":
        Number(l.adet || 0) * Number(l.fiyat || 0) +
        ((Number(l.adet || 0) * Number(l.fiyat || 0)) * Number(l.kdv || 0)) / 100,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teklif");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf]), "teklif.xlsx");
  };

  // EXCEL IMPORT (xlsx → teklif satırları)
  const importExcel = async (file) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Beklenen kolon isimleri: Ürün veya ÜrünAdı, Adet, Birim Fiyat, KDV %
      const mapped = json.map((r) => {
        const name = r["Ürün"] || r["ÜrünAdı"] || r["Urun"] || r["UrunAdi"] || "";
        const u = findUrunByName(name);
        return {
          urunId: u?._id || "",
          urunAd: name || u?.ad || "",
          adet: Number(r["Adet"] || r["Miktar"] || 1),
          fiyat: Number(r["Birim Fiyat"] || r["Fiyat"] || u?.satisFiyati || 0),
          kdv: Number(r["KDV %"] ?? u?.kdvOrani ?? 20),
        };
      });

      if (!mapped.length) {
        alert("Excel sayfası boş ya da sütunlar eksik.");
        return;
      }
      setLines(mapped);
    } catch (e) {
      console.error(e);
      alert("Excel içe aktarma sırasında hata.");
    }
  };

  // ───────────────────────────────────────────────────────────
  // PDF (Kurumsal Şablon)
  const pdfOlustur = () => {
    const cari = cariler.find((c) => c._id === cariId);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Üst şerit
    if (logo) doc.addImage(logo, "PNG", 40, 34, 110, 110, undefined, "FAST");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("TEKLİF FORMU", pageW - 40, 60, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, pageW - 40, 78, {
      align: "right",
    });

    // Firma / Cari kartları
    const firma = ["SatışTakip • Kurumsal Tedarikçi", "www.satistakip.online", "support@satistakip.online"].join("\n");
    const cariText = cari
      ? [
          `${cari.ad} (${cari.tur || "-"})`,
          `Tel: ${cari.telefon || "-"}`,
          `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
          `${cari.il || "-"} / ${cari.ilce || "-"}`,
        ].join("\n")
      : "Cari seçilmedi";

    doc.roundedRect(40, 160, pageW / 2 - 60, 70, 6, 6);
    doc.roundedRect(pageW / 2 + 20, 160, pageW / 2 - 60, 70, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.text("FİRMA", 52, 178);
    doc.text("MÜŞTERİ", pageW / 2 + 32, 178);
    doc.setFont("helvetica", "normal");
    doc.text(firma, 52, 196);
    doc.text(cariText, pageW / 2 + 32, 196);

    // Tablo
    const rows = lines.map((l, i) => {
      const ad = l.urunAd || findUrunById(l.urunId)?.ad || "";
      const tutar = Number(l.adet || 0) * Number(l.fiyat || 0);
      return [
        i + 1,
        ad,
        Number(l.adet || 0),
        fmt(Number(l.fiyat || 0)),
        `${Number(l.kdv || 0)}%`,
        fmt(tutar),
        fmt(tutar + (tutar * Number(l.kdv || 0)) / 100),
      ];
    });

    // @ts-ignore
    doc.autoTable({
      startY: 250,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 153, 0] },
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Tutar (KDV H.)", "Tutar (KDV D.)"]],
      body: rows,
      columnStyles: {
        0: { halign: "center", cellWidth: 28 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "center" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
      didDrawPage: () => {
        const y = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("SatışTakip • Teklif", 40, y);
        doc.text(String(doc.internal.getNumberOfPages()), pageW - 40, y, { align: "right" });
      },
    });

    // Toplam kutuları
    let y = doc.lastAutoTable.finalY + 14;
    const boxW = 180;

    const box = (label, val, idx) => {
      const x = pageW - 40 - boxW;
      const yy = y + idx * 24;
      doc.roundedRect(x, yy - 14, boxW, 22, 6, 6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(label, x + 10, yy);
      doc.setFont("helvetica", "normal");
      doc.text(val, x + boxW - 10, yy, { align: "right" });
    };

    box("Ara Toplam", `${fmt(araToplam)} TL`, 0);
    box("KDV Toplam", `${fmt(kdvTutar)} TL`, 1);
    box("Genel Toplam", `${fmt(genelToplam)} TL`, 2);

    // Not & şartlar
    let noteY = y + 90;
    doc.setFont("helvetica", "bold");
    doc.text("Not / Şartlar", 40, noteY);
    doc.setFont("helvetica", "normal");
    const defaultTerms =
      "• Teklif geçerlilik süresi: 7 gündür.\n• Ödeme: Peşin / Havale.\n• Teslim: Stok durumuna göre bilgilendirilecektir.";
    doc.text(not?.trim() ? not : defaultTerms, 40, noteY + 16);

    doc.save(`Teklif-${(cariler.find((c) => c._id === cariId)?.ad || "musteri")
      .replace(/[^\w\-]+/g, "_")}.pdf`);
  };

  // ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-orange-600">📄 Teklif Oluştur</h1>

      {/* Araç çubuğu */}
      <div className="bg-white rounded-xl p-4 shadow border border-gray-100 grid grid-cols-12 gap-3">
        <select
          className="border p-2 rounded col-span-12 md:col-span-4"
          value={cariId}
          onChange={(e) => setCariId(e.target.value)}
        >
          <option value="">Cari Seç *</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <div className="col-span-12 md:col-span-8 flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => logoRef.current?.click()}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            🖼️ Logo Ekle
          </button>
          <input ref={logoRef} type="file" hidden accept="image/*" onChange={pickLogo} />

          <button
            onClick={() => excelInRef.current?.click()}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            📥 Excel İçe Aktar
          </button>
          <input
            ref={excelInRef}
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])}
          />

          <button
            onClick={exportExcel}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            📤 Excel Dışa Aktar
          </button>

          <button
            onClick={pdfOlustur}
            className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700"
          >
            📎 PDF Oluştur
          </button>
        </div>
      </div>

      {/* Satırlar */}
      <div className="bg-white rounded-xl p-4 shadow border border-gray-100 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            {/* Ürün (ad üzerinden arama) */}
            <input
              list="urunList"
              className="border p-2 rounded col-span-12 md:col-span-4"
              placeholder="Ürün adı yaz / seç"
              value={l.urunAd}
              onChange={(e) => updateLine(i, "urunAd", e.target.value)}
            />
            <datalist id="urunList">
              {urunler.map((u) => (
                <option key={u._id} value={u.ad} />
              ))}
            </datalist>

            {/* Ya da direkt ürün seçimi */}
            <select
              className="border p-2 rounded col-span-12 md:col-span-3"
              value={l.urunId}
              onChange={(e) => updateLine(i, "urunId", e.target.value)}
            >
              <option value="">Ürün seç (ops.)</option>
              {urunler.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.ad}
                </option>
              ))}
            </select>

            <input
              className="border p-2 rounded col-span-4 md:col-span-2 text-right"
              type="number"
              placeholder="Adet"
              value={l.adet}
              onChange={(e) => updateLine(i, "adet", e.target.value)}
            />
            <input
              className="border p-2 rounded col-span-4 md:col-span-2 text-right"
              type="number"
              placeholder="Birim Fiyat"
              value={l.fiyat}
              onChange={(e) => updateLine(i, "fiyat", e.target.value)}
            />
            <select
              className="border p-2 rounded col-span-4 md:col-span-1"
              value={l.kdv}
              onChange={(e) => updateLine(i, "kdv", e.target.value)}
              title="KDV Oranı"
            >
              {[0, 1, 8, 10, 20].map((k) => (
                <option key={k} value={k}>
                  %{k}
                </option>
              ))}
            </select>

            <button
              onClick={() => removeLine(i)}
              className="col-span-12 md:col-span-0 text-red-600 px-2"
              title="Satırı sil"
            >
              ✖
            </button>
          </div>
        ))}

        <button className="bg-slate-200 px-3 py-1 rounded" onClick={addLine}>
          + Satır Ekle
        </button>

        <textarea
          className="border p-2 rounded w-full"
          placeholder="Not / Şartlar"
          value={not}
          onChange={(e) => setNot(e.target.value)}
        />

        <div className="text-right text-lg font-semibold">
          Ara Toplam: {fmt(araToplam)} TL &nbsp; • &nbsp; KDV: {fmt(kdvTutar)} TL
          &nbsp; • &nbsp; <span className="text-orange-600">Genel Toplam: {fmt(genelToplam)} TL</span>
        </div>
      </div>
    </div>
  );
}
