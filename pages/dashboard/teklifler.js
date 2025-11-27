// 📄 /pages/dashboard/teklifler.js
"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import RequireAuth from "@/components/RequireAuth";

/* ──────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────*/

// TRY format
const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Dinamik jsPDF + autoTable import (SSR hatalarını önler)
async function makeJsPDF() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

// Roboto fontlarını base64’e çevir
async function loadFontBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

// jsPDF’e Roboto ekler; yoksa Helvetica
async function ensureRoboto(doc) {
  const regularB64 = await loadFontBase64("/fonts/Roboto-Regular.ttf");
  const boldB64 = await loadFontBase64("/fonts/Roboto-Bold.ttf");

  if (regularB64) {
    doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  }
  if (boldB64) {
    doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  }

  const hasRoboto = !!regularB64;
  const setFont = (style = "normal") => {
    if (hasRoboto) doc.setFont("Roboto", style);
    else doc.setFont("helvetica", style);
  };
  return { hasRoboto, setFont };
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

// Teklif numarası üretimi (sadece front için fallback)
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

// UUID fallback
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now();
}

/* ──────────────────────────────────────────────
   Component
───────────────────────────────────────────────*/

export default function Teklifler() {
  // Data
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [teklifler, setTeklifler] = useState([]);
  const [company, setCompany] = useState(null);

  // Form
  const [cariId, setCariId] = useState("");
  const [not, setNot] = useState("");
  const [logo, setLogo] = useState(null);
  const [offerNumber, setOfferNumber] = useState(null);
  const [savedTeklifId, setSavedTeklifId] = useState(null); // ✅ DB id

  // 💱 Para birimi
  const [currency, setCurrency] = useState("TL");

  const logoRef = useRef(null);

  const [lines, setLines] = useState([
    { urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 },
  ]);

  // Tutar hesapları
  const araToplam = useMemo(
    () =>
      lines.reduce(
        (t, l) => t + Number(l.adet || 0) * Number(l.fiyat || 0),
        0
      ),
    [lines]
  );
  const kdvTutar = useMemo(
    () =>
      lines.reduce((t, l) => {
        const s = Number(l.adet || 0) * Number(l.fiyat || 0);
        return t + (s * Number(l.kdv || 0)) / 100;
      }, 0),
    [lines]
  );
  const genelToplam = useMemo(() => araToplam + kdvTutar, [araToplam, kdvTutar]);

  // Veri yükleme
  useEffect(() => {
  (async () => {
    try {
      // 🔐 Token al (sadece tarayıcıda çalışır)
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : "";

      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [cariR, urunR, compR, tklfR] = await Promise.allSettled([
        // 🟢 DÜZELTİLDİ: /api/cari/list → /api/cari + token
        fetch("/api/cari", { headers: authHeaders }),
        fetch("/api/urun/list", { headers: authHeaders }),
        fetch("/api/settings/company", { headers: authHeaders }),
        fetch("/api/teklif/list", { headers: authHeaders }),
      ]);

      if (cariR.status === "fulfilled" && cariR.value.ok) {
        const d = await cariR.value.json();
        setCariler(Array.isArray(d) ? d : d?.items || []);
      }

      if (urunR.status === "fulfilled" && urunR.value.ok) {
        const d = await urunR.value.json();
        setUrunler(Array.isArray(d) ? d : d?.items || []);
      }

      if (compR.status === "fulfilled" && compR.value.ok) {
        const d = await compR.value.json();
        setCompany(d);
      } else {
        const local = await loadCompanyInfo();
        setCompany(local);
      }

      if (tklfR.status === "fulfilled" && tklfR.value.ok) {
        const d = await tklfR.value.json();
        const list = Array.isArray(d) ? d : d?.items || [];
        setTeklifler(list);
        const lastNo = list[0]?.number || list[0]?.offerNumber;
        setOfferNumber(nextOfferNumber(lastNo));
      } else {
        setOfferNumber(nextOfferNumber(null));
      }
    } catch (e) {
      console.warn("Yükleme sırasında uyarı:", e);
    }
  })();
}, []);


  /* ───────── Satır işlemleri ───────── */

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 },
    ]);

  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const updateLine = (idx, key, val) =>
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, [key]: key === "urunId" ? val : val } : l
      )
    );

  const handleLogoPick = async (e) => {
    const f = e?.target?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(f);
  };

  const selectProduct = (idx, urunId) => {
    const u = urunler.find((x) => x._id === urunId);
    if (!u) return updateLine(idx, "urunId", urunId);
    const patch = {
      urunId,
      urunAd: u.ad || u.name || "",
      fiyat: Number(u.satisFiyati || u.price || 0),
    };
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  /* ───────── Teklif yükle / revize ───────── */

  const loadTeklifToForm = (t) => {
    setCariId(t.cariId || "");
    setLines(
      (t.lines && t.lines.length
        ? t.lines
        : [{ urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]
      ).map((l) => ({
        urunId: l.urunId || "",
        urunAd: l.urunAd || "",
        adet: Number(l.adet || 0),
        fiyat: Number(l.fiyat || 0),
        kdv: Number(l.kdv || 20),
      }))
    );
    setNot(t.note || "");
    setCurrency(t.currency || "TL");
    setOfferNumber(t.number || t.offerNumber || offerNumber);
    setSavedTeklifId(t._id || t.id || null);
    alert("📝 Teklif formu revize için yüklendi.");
  };

  /* ───────── Kaydet (DB’ye) ───────── */

  const kaydet = async () => {
    if (!cariId) return alert("Önce cari seçiniz.");
    if (!lines.length) return alert("En az bir satır ekleyiniz.");

    try {
      const body = {
        cariId,
        lines,
        note: not,
        logo,
        totals: { araToplam, kdvToplam: kdvTutar, genelToplam },
        currency,
      };

      const res = await fetch("/api/teklif/olustur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Teklif oluşturma hatası:", data);
        return alert("❌ Teklif oluşturulamadı: " + (data?.message || "Sunucu hatası"));
      }

      alert("✅ Teklif kaydedildi");

      // API'den dönen ID ve numarayı al
      const newId = data.id || data._id || null;
      const newNumber = data.number || data.offerNumber || offerNumber;

      setSavedTeklifId(newId);
      setOfferNumber(newNumber);

      setTeklifler((prev) => [
        {
          ...body,
          _id: newId || safeUUID(),
          number: newNumber,
          tarih: new Date().toISOString(),
          status: "Beklemede",
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Kaydet hatası:", err);
      alert("❌ Kayıt sırasında hata oluştu.");
    }
  };

  /* ───────── PDF oluştur ───────── */

  const pdfOlustur = async (downloadOnly = true) => {
    try {
      const { jsPDF, autoTable } = await makeJsPDF();
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      doc.setLineHeightFactor(1.4);
      const { setFont } = await ensureRoboto(doc);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Logo
      if (logo) {
        try {
          doc.addImage(logo, "PNG", 40, 30, 110, 110);
        } catch (err) {
          console.warn("Logo eklenemedi:", err);
        }
      }

      // Başlıklar
      setFont("bold");
      doc.setFontSize(18);
      doc.text("TEKLİF FORMU", pageW - 40, 58, { align: "right" });
      setFont("normal");
      doc.setFontSize(10);
      doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, pageW - 40, 76, {
        align: "right",
      });
      if (offerNumber)
        doc.text(`Teklif No: ${offerNumber}`, pageW - 40, 92, { align: "right" });

      // Firma bilgileri
      let y = 130;
      setFont("bold");
      doc.setFontSize(12);
      doc.text(company?.firmaAdi || "Kurumsal Tedarikçi", 40, y);
      setFont("normal");
      doc.setFontSize(10);
      if (company?.adres) doc.text(String(company.adres), 40, y + 16, { maxWidth: pageW / 2 - 60 });
      if (company?.telefon) doc.text(`Tel: ${company.telefon}`, 40, y + 40);
      if (company?.eposta) doc.text(`E-posta: ${company.eposta}`, 40, y + 56);

      // Müşteri bilgileri
      setFont("bold");
      doc.setFontSize(12);
      const cari = cariler.find((c) => c._id === cariId);
      doc.text(cari ? cari.ad || cari.name || "Müşteri" : "Müşteri", pageW / 2, y);
      setFont("normal");
      doc.setFontSize(10);
      if (cari?.adres)
        doc.text(String(cari.adres), pageW / 2, y + 16, { maxWidth: pageW / 2 - 60 });
      if (cari?.telefon) doc.text(`Tel: ${cari.telefon}`, pageW / 2, y + 40);
      if (cari?.eposta) doc.text(`E-posta: ${cari.eposta}`, pageW / 2, y + 56);

      // Ürün tablosu
      const bodyRows = (lines || []).map((it, i) => {
        const adet = Number(it.adet || 0);
        const fiyat = Number(it.fiyat || 0);
        const tutar = adet * fiyat;
        const kdvSatir = (tutar * Number(it.kdv || 0)) / 100;
        return [
          i + 1,
          it.urunAd || "-",
          adet,
          `${fmt(fiyat)} ${currency}`,
          `${fmt(kdvSatir)} ${currency}`,
          `${fmt(tutar + kdvSatir)} ${currency}`,
        ];
      });

      autoTable(doc, {
        startY: 220,
        head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
        body:
          bodyRows.length > 0
            ? bodyRows
            : [[1, "-", 1, `0,00 ${currency}`, `0,00 ${currency}`, `0,00 ${currency}`]],
        styles: { fontSize: 10, cellPadding: 6, lineWidth: 0.3 },
        headStyles: {
          fillColor: [255, 140, 0],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 28 },
          2: { halign: "right", cellWidth: 60 },
          3: { halign: "right", cellWidth: 100 },
          4: { halign: "right", cellWidth: 100 },
          5: { halign: "right", cellWidth: 110 },
        },
        theme: "grid",
      });

      // Toplamlar
      y = doc.lastAutoTable.finalY + 22;

      setFont("bold");
      doc.setFontSize(12);
      doc.text(`Ara Toplam: ${fmt(araToplam)} ${currency}`, pageW - 40, y, { align: "right" });
      doc.text(`KDV: ${fmt(kdvTutar)} ${currency}`, pageW - 40, y + 18, { align: "right" });
      doc.text(`Genel Toplam: ${fmt(genelToplam)} ${currency}`, pageW - 40, y + 36, {
        align: "right",
      });

      // Geçerlilik
      const validUntil = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("tr-TR");
      setFont("normal");
      doc.setFontSize(10);
      doc.text(`Teklif geçerlilik tarihi: ${validUntil}`, 40, y + 54);

      // Kur notu – KISALTTIM (dağılma sorununu çözmek için)
      doc.text(
        `Fiyatlar ${currency} bazındadır. Faturalandırma, fatura tarihindeki TCMB döviz kuru esas alınır.`,
        40,
        y + 72,
        { maxWidth: pageW - 80 }
      );

      // Kullanıcının girdiği not
      if (not && not.trim()) {
        const notY = y + 100;
        setFont("bold");
        doc.setFontSize(11);
        doc.text("Not / Şartlar:", 40, notY);
        setFont("normal");
        doc.setFontSize(10);
        doc.text(not, 40, notY + 16, { maxWidth: pageW - 80 });
      }

      // 🔗 Online onay linki
      if (savedTeklifId) {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "https://www.satistakip.online";
        const onayUrl = `${origin}/teklif/onay/${savedTeklifId}?ok=1`;

        const linkY = pageH - 80;
        setFont("bold");
        doc.setFontSize(10);
        doc.text("Online onay linki:", 40, linkY);
        setFont("normal");
        doc.setTextColor(0, 0, 255);
        doc.text(onayUrl, 40, linkY + 16, { maxWidth: pageW - 80 });
        doc.setTextColor(0, 0, 0);
      }

      // Footer
      setFont("normal");
      doc.setFontSize(9);
      doc.text("Kurumsal Tedarikçi • www.tedarikci.org.tr", pageW / 2, pageH - 24, {
        align: "center",
      });

      const fileName = `Teklif-${offerNumber || "musteri"}.pdf`;

      if (downloadOnly) {
        doc.save(fileName);
        return null;
      } else {
        const base64 = doc.output("datauristring").split(",")[1];
        return { base64, fileName };
      }
    } catch (err) {
      console.error("❌ PDF oluşturulamadı:", err);
      alert("❌ PDF oluşturulamadı. Konsolu kontrol edin.");
      return null;
    }
  };

  /* ───────── PDF'yi Sunucuya Kaydet ───────── */

  const sunucuyaKaydet = async () => {
    if (!cariId) return alert("Önce cari seçiniz.");

    const pdf = await pdfOlustur(false);
    if (!pdf) return;

    try {
      const res = await fetch("/api/teklif/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: pdf.base64,
          fileName: pdf.fileName,
          cariId,
          offerNumber,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Kaydetme hatası:", data);
        return alert(
          "❌ PDF sunucuya kaydedilemedi: " + (data?.message || "Sunucu hatası")
        );
      }

      alert("✅ PDF sunucuya başarıyla kaydedildi!");
    } catch (err) {
      console.error("Sunucuya kaydetme hatası:", err);
      alert("❌ Sunucuya kaydetme sırasında hata oluştu.");
    }
  };

  /* ───────── Mail Gönder ───────── */

  const mailGonder = async () => {
    const cari = cariler.find((c) => c._id === cariId);
    if (!cari) return alert("Önce cari seçiniz.");

    const pdf = await pdfOlustur(false);
    if (!pdf) return;

    try {
      const res = await fetch("/api/teklif/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: cari?.eposta || cari?.email || company?.eposta,
          subject: `Teklif - ${offerNumber || ""}`,
          message:
            "Sayın Yetkili, ekte teklif detaylarını bulabilirsiniz.\nİyi çalışmalar dileriz.\nKurumsal Tedarikçi",
          pdfBase64: pdf.base64,
          fileName: pdf.fileName,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Mail gönderim hatası:", data);
        return alert("❌ Mail gönderilemedi: " + (data?.message || "Sunucu hatası"));
      }

      alert("✅ Teklif mail olarak başarıyla gönderildi!");
    } catch (err) {
      console.error("Mail gönderirken hata:", err);
      alert("❌ Mail gönderme sırasında hata oluştu.");
    }
  };

  /* ───────── Excel dışa aktarım ───────── */

  const exportExcel = () => {
    const wsData = [
      ["Ürün", "Adet", "Birim Fiyat", "KDV", "Tutar"],
      ...lines.map((l) => [
        l.urunAd || "",
        Number(l.adet || 0),
        Number(l.fiyat || 0),
        Number(l.kdv || 0),
        Number(l.adet || 0) * Number(l.fiyat || 0),
      ]),
      [],
      ["Ara Toplam", araToplam],
      ["KDV", kdvTutar],
      ["Genel Toplam", genelToplam],
      ["Para Birimi", currency],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Teklif");
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `Teklif-${offerNumber || "musteri"}.xlsx`
    );
  };

  // Para Birimi Seçimi (UI)
  const ParaBirimiSecimi = () => (
    <div className="mt-3">
      <label className="text-sm text-gray-600 mr-2">Para Birimi:</label>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="TL">TL (₺)</option>
        <option value="USD">USD ($)</option>
        <option value="EUR">EUR (€)</option>
        <option value="GBP">GBP (£)</option>
      </select>
    </div>
  );

  /* ───────── RENDER ───────── */

  return (
    <RequireAuth>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-orange-600">📄 Teklif Oluştur</h1>

        {/* Cari + Para Birimi */}
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm text-gray-600 mr-2">Cari Seç:</label>
            <select
              value={cariId}
              onChange={(e) => setCariId(e.target.value)}
              className="border rounded px-3 py-2 min-w-[260px]"
            >
              <option value="">Seçiniz…</option>
              {cariler.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.ad || c.name}
                </option>
              ))}
            </select>
          </div>

          {ParaBirimiSecimi()}
        </div>

        {/* Logo ve Not */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Logo</label>
            <div className="flex items-center gap-2">
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                onChange={handleLogoPick}
              />
              {logo && <span className="text-xs text-emerald-600">Seçildi</span>}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">Not / Şartlar</label>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value)}
              rows={4}
              className="w-full border rounded px-3 py-2"
              placeholder="Örn: Fiyatlar USD bazındadır. Fatura tarihindeki TCMB kuru esas alınır…"
            />
          </div>
        </div>

        {/* Satırlar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Teklif Satırları</h2>
            <button
              onClick={addLine}
              className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-900"
            >
              ➕ Satır Ekle
            </button>
          </div>

          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Ürün</th>
                  <th className="px-3 py-2 text-right">Adet</th>
                  <th className="px-3 py-2 text-right">Birim Fiyat</th>
                  <th className="px-3 py-2 text-right">KDV (%)</th>
                  <th className="px-3 py-2 text-right">Tutar</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const satir = Number(l.adet || 0) * Number(l.fiyat || 0);
                  const kdv = (satir * Number(l.kdv || 0)) / 100;
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <select
                            value={l.urunId || ""}
                            onChange={(e) => selectProduct(idx, e.target.value)}
                            className="border rounded px-2 py-1"
                          >
                            <option value="">Ürün seçiniz…</option>
                            {urunler.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.ad || u.name}
                              </option>
                            ))}
                          </select>
                          <input
                            value={l.urunAd || ""}
                            onChange={(e) => updateLine(idx, "urunAd", e.target.value)}
                            className="border rounded px-2 py-1"
                            placeholder="Ürün adı"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={l.adet}
                          onChange={(e) => updateLine(idx, "adet", Number(e.target.value))}
                          className="w-24 border rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.fiyat}
                          onChange={(e) => updateLine(idx, "fiyat", Number(e.target.value))}
                          className="w-28 border rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <select
                          value={l.kdv}
                          onChange={(e) => updateLine(idx, "kdv", e.target.value)}
                          className="border rounded px-2 py-1"
                        >
                          {[0, 1, 8, 10, 20].map((k) => (
                            <option key={k} value={k}>
                              %{k}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmt(satir + kdv)} {currency}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeLine(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✖
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toplamlar */}
        <div className="text-right font-semibold text-lg">
          Ara Toplam: {fmt(araToplam)} {currency} &nbsp;•&nbsp; KDV: {fmt(kdvTutar)}{" "}
          {currency} &nbsp;•&nbsp;
          <span className="text-orange-600">
            Genel Toplam: {fmt(genelToplam)} {currency}
          </span>
        </div>

        {/* İşlem Butonları */}
        <div className="flex flex-wrap justify-end gap-2 mt-4">
          <button
            onClick={kaydet}
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            💾 Kaydet
          </button>
          <button
            onClick={() => pdfOlustur(true)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            🧾 PDF Oluştur
          </button>
          <button
            onClick={sunucuyaKaydet}
            className="px-4 py-2 rounded bg-slate-600 text-white hover:bg-slate-700"
          >
            ☁️ Sunucuya Kaydet
          </button>
          <button
            onClick={mailGonder}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            ✉️ Mail Gönder
          </button>
          <button
            onClick={exportExcel}
            className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600"
          >
            📊 Excel Dışa Aktar
          </button>
        </div>

        {/* Taslaklar / Revize */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100 mt-6">
          <div className="font-semibold mb-2">🗂️ Kaydedilmiş Teklifler</div>
          {teklifler.length === 0 ? (
            <div className="text-sm text-gray-500">Henüz kayıtlı teklif yok.</div>
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
                  <th className="p-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {teklifler.map((t) => {
                  const cc = cariler.find((c) => c._id === t.cariId);
                  const ara = t.lines?.reduce(
                    (sum, l) => sum + Number(l.adet || 0) * Number(l.fiyat || 0),
                    0
                  ) || 0;
                  const kdv = t.lines?.reduce(
                    (sum, l) =>
                      sum +
                      ((Number(l.adet || 0) * Number(l.fiyat || 0)) *
                        Number(l.kdv || 0)) /
                        100,
                    0
                  ) || 0;
                  return (
                    <tr key={t._id || t.id || t.number} className="border-b hover:bg-slate-50">
                      <td className="p-2">
                        {t.createdAt
                          ? new Date(t.createdAt).toLocaleString("tr-TR")
                          : t.tarih
                          ? new Date(t.tarih).toLocaleString("tr-TR")
                          : "-"}
                      </td>
                      <td className="p-2">{cc?.ad || t.cariAd || "-"}</td>
                      <td className="p-2">{t.status || "Beklemede"}</td>
                      <td className="p-2">{t.number || t.offerNumber || "-"}</td>
                      <td className="p-2 text-right">{t.lines?.length || 0}</td>
                      <td className="p-2 text-right">
                        {fmt(ara + kdv)} {t.currency || "TL"}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => loadTeklifToForm(t)}
                          className="px-2 py-1 text-xs rounded bg-sky-600 text-white hover:bg-sky-700"
                        >
                          🔁 Revize / Yükle
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
    </RequireAuth>
  );
}
