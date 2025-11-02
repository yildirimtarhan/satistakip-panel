"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import RequireAuth from "@/components/RequireAuth";  // ✅ Ekledik

/* ──────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────*/

// TRY format
const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Dinamik jsPDF import (SSR hatalarını önler)
async function makeJsPDF() {
  const [{ default: jsPDF }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return jsPDF;
}

// Firma bilgisi (API -> localStorage -> varsayılan)
async function loadCompanyInfo() {
  try {
    const r = await fetch("/api/settings/company");
    if (r.ok) return await r.json();
  } catch {}
  try {
    const local = JSON.parse(localStorage.getItem("company_info") || "{}");
    if (local && local.firmaAdi) return local;
  } catch {}
  return {
    firmaAdi: "Kurumsal Tedarikçi",
    yetkili: "Yıldırım Ayluçtarhan",
    adres:
      "Karlıktepe Mah. Spor Cd. No:22/B, Kartal / İstanbul\nŞube: Hacı Yusuf Mh. Eser Sk. No:4/10, Bandırma / Balıkesir",
    telefon: "0505 911 27 49",
    eposta: "iletisim@tedarikci.org.tr",
    web: "www.tedarikci.org.tr",
    vergiDairesi: "Bandırma",
    vergiNo: "1230162474",
  };
}

// Teklif numarası (T-YYYY-0001 format)
function nextOfferNumber(lastNumber) {
  const y = new Date().getFullYear();
  if (!lastNumber) return `T-${y}-0001`;
  const m = String(lastNumber).match(/^T-(\d{4})-(\d{4})$/);
  if (!m) return `T-${y}-0001`;
  const lastY = Number(m[1]);
  const lastSeq = Number(m[2]);
  if (lastY !== y) return `T-${y}-0001`;
  return `T-${y}-${String(lastSeq + 1).padStart(4, "0")}`;
}

// randomUUID fallback
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now();
}

/* ──────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────*/

export default function Teklifler() {
  // Data
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [teklifler, setTeklifler] = useState([]); // local taslak listesi
  const [company, setCompany] = useState(null);

  // Form
  const [cariId, setCariId] = useState("");
  const [not, setNot] = useState("");
  const [logo, setLogo] = useState(null);
  const [editId, setEditId] = useState(null); // taslak düzenleme id
  const [status, setStatus] = useState("Bekliyor"); // Bekliyor | Onaylandı | Reddedildi
  const [offerNumber, setOfferNumber] = useState(null); // T-YYYY-0001

  // Refs
  const logoRef = useRef(null);
  const excelInRef = useRef(null);

  // Satırlar
  const [lines, setLines] = useState([{ urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]);

  // Türetilmiş
  const cari = useMemo(() => cariler.find((c) => c._id === cariId), [cariler, cariId]);
  const araToplam = useMemo(
    () => lines.reduce((t, l) => t + Number(l.adet || 0) * Number(l.fiyat || 0), 0),
    [lines]
  );
  const kdvTutar = useMemo(() => {
    return lines.reduce((t, l) => {
      const s = Number(l.adet || 0) * Number(l.fiyat || 0);
      return t + (s * Number(l.kdv || 0)) / 100;
    }, 0);
  }, [lines]);
  const genelToplam = useMemo(() => araToplam + kdvTutar, [araToplam, kdvTutar]);

  /* ── İlk yükleme */
  useEffect(() => {
    (async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      try {
        const [cRes, uRes, comp] = await Promise.allSettled([
          fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } }),
          loadCompanyInfo(),
        ]);

        if (cRes.status === "fulfilled") {
          const d = await cRes.value.json();
          Array.isArray(d) && setCariler(d);
        }
        if (uRes.status === "fulfilled") {
          const d = await uRes.value.json();
          Array.isArray(d) && setUrunler(d);
        }
        if (comp.status === "fulfilled") setCompany(comp.value);

        const raw = localStorage.getItem("teklif_taslaklari");
        if (raw) {
          try {
            setTeklifler(JSON.parse(raw) || []);
          } catch {}
        }

        // Son teklif numarası
        const last = localStorage.getItem("last_offer_number") || null;
        setOfferNumber(nextOfferNumber(last));
      } catch {}
    })();
  }, []);

  // Ürün bulucular
  const findUrunById = (id) => urunler.find((u) => u._id === id);
  const findUrunByName = (name) =>
    urunler.find((u) => (u.ad || "").toLowerCase() === (name || "").toLowerCase());

  // Satır işlemleri
  const addLine = () =>
    setLines((p) => [...p, { urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]);

  const removeLine = (i) => setLines((p) => p.filter((_, x) => x !== i));

  const updateLine = (i, field, val) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: val };

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

  // Logo seç
  const pickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogo(r.result);
    r.readAsDataURL(f);
  };

  /* Excel Dışa Aktar */
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

  /* Excel İçe Aktar */
  const importExcel = async (file) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

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

      if (!mapped.length) return alert("Excel sayfası boş ya da sütunlar eksik.");
      setLines(mapped);
    } catch (e) {
      console.error(e);
      alert("Excel içe aktarma sırasında hata.");
    }
  };

  /* Taslaklar (localStorage) */
  const persistDrafts = (arr) => localStorage.setItem("teklif_taslaklari", JSON.stringify(arr));

  const yeniTeklif = () => {
    setCariId("");
    setNot("");
    setLogo(null);
    setEditId(null);
    setStatus("Bekliyor");
    setLines([{ urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]);
    const last = localStorage.getItem("last_offer_number") || null;
    setOfferNumber(nextOfferNumber(last));
  };

  const kaydetTaslak = () => {
    if (!cariId) return alert("Cari seçmeden kaydedemezsiniz.");
    const draft = {
      id: editId || safeUUID(),
      tarih: new Date().toISOString(),
      cariId,
      not,
      logo,
      status,
      offerNumber: offerNumber || null,
      lines,
    };
    const next = editId
      ? teklifler.map((t) => (t.id === editId ? draft : t))
      : [draft, ...teklifler];
    setTeklifler(next);
    persistDrafts(next);
    setEditId(draft.id);
    alert("✅ Taslak kaydedildi.");
  };

  const duzenleTaslak = (id) => {
    const d = teklifler.find((t) => t.id === id);
    if (!d) return;
    setEditId(d.id);
    setCariId(d.cariId);
    setNot(d.not || "");
    setLogo(d.logo || null);
    setLines(d.lines || []);
    setStatus(d.status || "Bekliyor");
    setOfferNumber(d.offerNumber || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const silTaslak = (id) => {
    if (!confirm("Bu taslak silinsin mi?")) return;
    const next = teklifler.filter((t) => t.id !== id);
    setTeklifler(next);
    persistDrafts(next);
    if (editId === id) yeniTeklif();
  };

  /* PDF OLUŞTUR 
     downloadOnly=true -> direkt indir
     downloadOnly=false -> {base64, fileName} döner (mail için)
  */
  const pdfOlustur = async (downloadOnly = true) => {
    try {
      const jsPDF = await makeJsPDF();
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      if (logo) doc.addImage(logo, "PNG", 40, 34, 110, 110, undefined, "FAST");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("TEKLİF FORMU", pageW - 40, 60, { align: "right" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, pageW - 40, 78, { align: "right" });
      if (offerNumber) doc.text(`Teklif No: ${offerNumber}`, pageW - 40, 94, { align: "right" });

      const firma = company
        ? [
            company.firmaAdi,
            company.web,
            company.eposta,
            company.telefon,
            `Vergi: ${company.vergiDairesi} / ${company.vergiNo}`,
            company.adres,
          ]
            .filter(Boolean)
            .join("\n")
        : "SatışTakip • Kurumsal Tedarikçi\nwww.satistakip.online\nsupport@satistakip.online";

      const cariText = cari
        ? [
            `${cari.ad} (${cari.tur || "-"})`,
            `Tel: ${cari.telefon || "-"}`,
            `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
            `${cari.il || "-"} / ${cari.ilce || "-"}`,
            cari.adres || "",
          ]
            .filter(Boolean)
            .join("\n")
        : "Cari seçilmedi";

      doc.roundedRect(40, 160, pageW / 2 - 60, 88, 6, 6);
      doc.roundedRect(pageW / 2 + 20, 160, pageW / 2 - 60, 88, 6, 6);
      doc.setFont("helvetica", "bold");
      doc.text("FİRMA", 52, 178);
      doc.text("MÜŞTERİ", pageW / 2 + 32, 178);
      doc.setFont("helvetica", "normal");
      doc.text(firma, 52, 196);
      doc.text(cariText, pageW / 2 + 32, 196);

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
        startY: 270,
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

      let noteY = y + 90;
      doc.setFont("helvetica", "bold");
      doc.text("Not / Şartlar", 40, noteY);
      doc.setFont("helvetica", "normal");
      const defaultTerms =
        "• Teklif geçerlilik süresi: 7 gündür.\n• Ödeme: Peşin / Havale.\n• Teslim: Stok durumuna göre bilgilendirilecektir.";
      doc.text(not?.trim() ? not : defaultTerms, 40, noteY + 16);

      const fileName = `Teklif-${offerNumber || (cari?.ad || "musteri")}.pdf`;

      if (downloadOnly) {
        doc.save(fileName);
        return null;
      } else {
        // mail için base64 döndür
        const b64 = doc.output("datauristring").split(",")[1]; // sadece base64
        return { base64: b64, fileName };
      }
    } catch (err) {
      console.error(err);
      alert("PDF oluşturulamadı.");
      return null;
    }
  };

  /* Sunucuya kaydet (numara al) */
  const sunucuyaKaydet = async () => {
    if (!cariId || lines.length === 0) return alert("Cari ve satırlar zorunlu.");
    try {
      const body = {
        cariId,
        lines,
        note: not,
        logo,
        status,
        offerNumber, // mümkünse bu numara ile kaydedelim
        totals: { araToplam, kdvToplam: kdvTutar, genelToplam },
      };
      const r = await fetch("/api/teklif/olustur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) return alert("❌ " + (data?.message || "Hata"));

      // Backend number verdiyse onu al
      const given = data.number || data.offerNumber || offerNumber;
      if (given) {
        setOfferNumber(given);
        localStorage.setItem("last_offer_number", given);
      }
      alert(`✅ Kaydedildi • #${given}`);
    } catch (e) {
      console.error(e);
      alert("Kaydederken hata.");
    }
  };

  /* Mail gönder (Zoho SMTP: /api/teklif/mail) */
  const mailGonder = async () => {
    if (!cari) return alert("Önce cari seçiniz.");
    const pdf = await pdfOlustur(false);
    if (!pdf) return;

    try {
      const r = await fetch("/api/teklif/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teklifId: "__client_only__", // DB’de oluşturduktan sonra gerçek id gönderilebilir
          toEmail: cari.email || company?.eposta,
          pdfBase64: pdf.base64,
        }),
      });
      const data = await r.json();
      if (!r.ok) return alert("❌ Mail gönderilemedi: " + (data?.message || "Hata"));
      alert("✅ Mail gönderildi.");
    } catch (e) {
      console.error(e);
      alert("Mail gönderirken hata.");
    }
  };

  /* WhatsApp paylaşımı */
  const whatsappShare = () => {
    const cariAd = cari?.ad || "Müşteri";
    const metin =
      `Merhaba ${cariAd},%0A` +
      `Teklif No: ${offerNumber || "-"}%0A` +
      `Genel Toplam: ${fmt(genelToplam)} TL%0A` +
      `Not: ${(not || "").replace(/\n/g, " ")}`;
    const url = `https://wa.me/?text=${metin}`;
    window.open(url, "_blank");
  };

  /* ───────────────────── UI ───────────────────── */

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-orange-600">📄 Teklif Oluştur</h1>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-4 shadow border border-gray-100 grid grid-cols-12 gap-3">
        {/* Cari seç */}
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

        {/* Durum */}
        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Bekliyor</option>
          <option>Onaylandı</option>
          <option>Reddedildi</option>
        </select>

        {/* Teklif No (readonly) */}
        <input
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={offerNumber || ""}
          readOnly
          placeholder="Teklif No otomatik"
        />

        {/* Aksiyonlar */}
        <div className="col-span-12 md:col-span-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => logoRef.current?.click()}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            🖼️ Logo
          </button>
          <input ref={logoRef} type="file" hidden accept="image/*" onChange={pickLogo} />
          <button
            onClick={() => excelInRef.current?.click()}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            📥 Excel İçe
          </button>
          <input
            ref={excelInRef}
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])}
          />
          <button onClick={exportExcel} className="px-3 py-2 border rounded hover:bg-gray-50">
            📤 Excel Dışa
          </button>
          <button
            onClick={() => pdfOlustur(true)}
            className="px-3 py-2 rounded bg-orange-600 text-white hover:bg-orange-700"
          >
            📎 PDF
          </button>
        </div>

        {/* Alt aksiyon satırı */}
        <div className="col-span-12 flex flex-wrap gap-2 justify-end">
          <button onClick={sunucuyaKaydet} className="px-3 py-2 border rounded hover:bg-gray-50">
            💾 Sunucuya Kaydet (Numara)
          </button>
          <button onClick={mailGonder} className="px-3 py-2 border rounded hover:bg-gray-50">
            ✉️ Mail Gönder
          </button>
          <button onClick={whatsappShare} className="px-3 py-2 border rounded hover:bg-gray-50">
            🟢 WhatsApp
          </button>
          <button
            onClick={kaydetTaslak}
            className="bg-emerald-600 text-white px-3 py-2 rounded"
          >
            {editId ? "💾 Taslağı Güncelle" : "💾 Taslak Kaydet"}
          </button>
          <button onClick={yeniTeklif} className="bg-gray-600 text-white px-3 py-2 rounded">
            🆕 Yeni
          </button>
        </div>
      </div>

      {/* Satırlar */}
      <div className="bg-white rounded-xl p-4 shadow border border-gray-100 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
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
            >
              ✖
            </button>
          </div>
        ))}

        <textarea
          className="border p-2 rounded w-full"
          placeholder="Not / Şartlar"
          value={not}
          onChange={(e) => setNot(e.target.value)}
        />

        <div className="text-right text-lg font-semibold">
          Ara Toplam: {fmt(araToplam)} TL &nbsp; • &nbsp; KDV: {fmt(kdvTutar)} TL &nbsp; • &nbsp;{" "}
          <span className="text-orange-600">Genel Toplam: {fmt(genelToplam)} TL</span>
        </div>
      </div>

      {/* Taslaklar */}
      <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
        <div className="font-semibold mb-2">🗂️ Kaydedilmiş Taslaklar</div>
        {teklifler.length === 0 ? (
          <div className="text-sm text-gray-500">Henüz taslak yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="p-2 text-left">Tarih</th>
                <th className="p-2 text-left">Cari</th>
                <th className="p-2 text-left">Durum</th>
                <th className="p-2 text-left">Teklif No</th>
                <th className="p-2 text-right">Satır</th>
                <th className="p-2 text-right">Genel Toplam</th>
                <th className="p-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {teklifler.map((t) => {
                const cc = cariler.find((c) => c._id === t.cariId);
                const ara = t.lines.reduce(
                  (sum, l) => sum + Number(l.adet || 0) * Number(l.fiyat || 0),
                  0
                );
                const kdv = t.lines.reduce(
                  (sum, l) =>
                    sum + ((Number(l.adet || 0) * Number(l.fiyat || 0)) * Number(l.kdv || 0)) / 100,
                  0
                );
                return (
                  <tr key={t.id} className="border-b hover:bg-slate-50">
                    <td className="p-2">{new Date(t.tarih).toLocaleString("tr-TR")}</td>
                    <td className="p-2">{cc?.ad || "-"}</td>
                    <td className="p-2">{t.status || "Bekliyor"}</td>
                    <td className="p-2">{t.offerNumber || "-"}</td>
                    <td className="p-2 text-right">{t.lines.length}</td>
                    <td className="p-2 text-right">{fmt(ara + kdv)} TL</td>
                    <td className="p-2 text-center space-x-2">
                      <button className="text-blue-600" onClick={() => duzenleTaslak(t.id)}>
                        ✏️
                      </button>
                      <button className="text-red-600" onClick={() => silTaslak(t.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
