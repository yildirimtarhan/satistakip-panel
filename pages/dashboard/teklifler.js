// 📄 /pages/dashboard/teklifler.js
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import RequireAuth from "@/components/RequireAuth";

/* ──────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────*/

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
    if (buf.byteLength < 100) return null; // boş/bozuk dosya kontrolü
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

// jsPDF'e Roboto ekler; Bold yoksa Regular'ı Bold olarak da kaydeder (Türkçe desteği için)
async function ensureRoboto(doc) {
  const regularB64 = await loadFontBase64("/fonts/Roboto-Regular.ttf");
  const boldB64 = await loadFontBase64("/fonts/Roboto-Bold.ttf");

  if (regularB64) {
    doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    // Bold dosyası geçersizse Regular'ı Bold olarak da kaydet
    if (!boldB64) {
      doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
    }
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
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now();
}

/* ──────────────────────────────────────────────
   Component
──────────────────────────────────────────────*/

export default function Teklifler() {

  // ✅ EN ÜSTE STATE KISMINA EKLE
  
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
  const renderStatusBadge = (status) => {
  const map = {
    kaydedildi: { text: "Kaydedildi", cls: "bg-gray-100 text-gray-800" },
    pdf_yuklendi: { text: "PDF Yüklendi", cls: "bg-blue-100 text-blue-800" },
    gonderildi: { text: "Gönderildi", cls: "bg-purple-100 text-purple-800" },
    onaylandi: { text: "Onaylandı ✅", cls: "bg-green-100 text-green-800" },
    revize_istendi: { text: "Revize İstendi ⚠️", cls: "bg-red-100 text-red-800" },
    revize_edildi: { text: "Revize Edildi", cls: "bg-orange-100 text-orange-800" },
  };

  const s = map[status] || { text: status || "-", cls: "bg-gray-50 text-gray-600" };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${s.cls}`}>
      {s.text}
    </span>
  );
};


 const buildKalemler = () => {
  return (lines || [])
    .filter((l) => l?.urunId) // ✅ urunId varsa satır geçerli
    .map((l) => {
      const adet = Number(l?.adet || 0) > 0 ? Number(l.adet) : 1;
      const birimFiyat = Number(l?.fiyat ?? 0);
      const kdvOrani = Number(l?.kdv ?? 0);

      return {
        urunId: l.urunId,
        urunAdi: l?.urunAd || l?.urunAdi || "Ürün", // ✅ boş kalmasın
        adet,
        birimFiyat,
        kdvOrani,
      };
    });
};

  // 💱 Para birimi
  const [currency, setCurrency] = useState("TL");

  const logoRef = useRef(null);

  // 🔐 Her istek için token header üret
  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [lines, setLines] = useState([{ urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]);

  // Tutar hesapları
  const araToplam = useMemo(
    () => lines.reduce((t, l) => t + Number(l.adet || 0) * Number(l.fiyat || 0), 0),
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
// Veri yükleme (sayfa açılınca 1 kere)
useEffect(() => {
  (async () => {
    try {
      const authHeaders = getAuthHeaders();

      const [cariR, urunR, compR, tklfR] = await Promise.allSettled([
        fetch("/api/cari", { headers: authHeaders }),
        fetch("/api/products/list", { headers: authHeaders }),
        fetch("/api/settings/company", { headers: authHeaders }),
        fetch("/api/teklif/list", { headers: authHeaders }),
      ]);

      // Cariler
      if (cariR.status === "fulfilled" && cariR.value.ok) {
        const d = await cariR.value.json();
        setCariler(Array.isArray(d) ? d : d?.items || []);
      }

      // Ürünler
      if (urunR.status === "fulfilled" && urunR.value.ok) {
        const d = await urunR.value.json();
        setUrunler(Array.isArray(d) ? d : d?.products || d?.items || []);
      }

      // Firma
      if (compR.status === "fulfilled" && compR.value.ok) {
        const d = await compR.value.json();
        setCompany(d);
      } else {
        const local = await loadCompanyInfo();
        setCompany(local);
      }

      // Teklifler (API -> { teklifler })
      if (tklfR.status === "fulfilled" && tklfR.value.ok) {
        const d = await tklfR.value.json();
        const list = d?.teklifler || [];
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
// ✅ Cari seçilince eski teklifleri getir
// ✅ Cari seçilince eski teklifleri getir
useEffect(() => {
  (async () => {
    try {
      const authHeaders = getAuthHeaders();

      const url = cariId
        ? `/api/teklif/list?cariId=${cariId}`
        : "/api/teklif/list";

      const res = await fetch(url, {
        headers: authHeaders,
        cache: "no-store",
      });

      const d = await res.json();
      setTeklifler(d?.teklifler || []);
    } catch (e) {
      console.warn("Cari teklifleri çekilemedi:", e);
    }
  })();
}, [cariId]);


  

  /* ───────── Satır işlemleri ───────── */

  const addLine = () =>
    setLines((prev) => [...prev, { urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]);

  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const updateLine = (idx, key, val) =>
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [key]: key === "urunId" ? val : val } : l))
    );

  const handleLogoPick = async (e) => {
    const f = e?.target?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(f);
  };

  const selectProduct = (idx, urunId) => {
  const u = urunler.find((x) => x._id === urunId || x.id === urunId);

  if (!u) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, urunId } : l)));
    return;
  }

  const urunAd =
    u.ad || u.name || u.urunAd || u.title || u.urunAdi || "-";

  const fiyat = Number(
    u.satisFiyati || u.salePrice || u.price || u.fiyat || u.satisFiyat || 0
  );

  setLines((prev) =>
    prev.map((l, i) =>
      i === idx
        ? { ...l, urunId, urunAd, fiyat, adet: Number(l.adet || 0) > 0 ? l.adet : 1, kdv: l.kdv ?? 20 }
        : l
    )
  );
};



  /* ───────── Teklif yükle / revize ───────── */

  const loadTeklifToForm = (t) => {
  setCariId(t.cariId || "");

  // ✅ DB: kalemler, Front: lines
  const src = Array.isArray(t.kalemler) ? t.kalemler : Array.isArray(t.lines) ? t.lines : [];

  setLines(
    (src.length ? src : [{ urunId: "", urunAd: "", adet: 1, fiyat: 0, kdv: 20 }]).map((k) => ({
      urunId: k.urunId || "",
      urunAd: k.urunAdi || k.urunAd || "",
      adet: Number(k.adet || 1),
      fiyat: Number(k.birimFiyat ?? k.fiyat ?? 0),
      kdv: Number(k.kdvOrani ?? k.kdv ?? 20),
    }))
  );

  setNot(t.not || t.note || "");
  setCurrency(t.paraBirimi || t.currency || "TL");
  setOfferNumber(t.number || t.offerNumber || offerNumber);
  setSavedTeklifId(t._id || t.id || null);

  alert("📝 Teklif formu revize için yüklendi.");
};


  /* ───────── Kaydet (DB’ye) ───────── */

 /* ───────── Kaydet (DB’ye) ───────── */
const kaydet = async () => {
  if (!cariId) return alert("Önce cari seçiniz.");

  const kalemler = buildKalemler();
  if (!kalemler.length) return alert("❌ Ürün/Hizmet kalemleri boş olamaz");

  try {
    const body = {
      number: offerNumber,
      cariId,
      paraBirimi: currency,
      not,
      kalemler, // ✅ backend bunu bekliyor
    };

    const res = await fetch("/api/teklif/olustur", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Teklif oluşturma hatası:", data);
      return alert("❌ Teklif oluşturulamadı: " + (data?.message || "Sunucu hatası"));
    }

    // ✅ ID set et (EN KRİTİK)
    const teklif = data?.teklif;
    const id = data?.teklifId || data?._id || teklif?._id;
    if (id) setSavedTeklifId(id);

    alert("✅ Teklif kaydedildi");

    // ✅ listeyi yenile
    const listRes = await fetch("/api/teklif/list", {
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });

    const listData = await listRes.json();
    setTeklifler(listData?.teklifler || listData?.items || []);
  } catch (err) {
    console.error("Kaydet hatası:", err);
    alert("❌ Kayıt sırasında hata oluştu.");
  }
};


  /* ───────── PDF oluştur ───────── */

  const pdfOlustur = async (downloadOnly = true) => {
    try {
      const { jsPDF, autoTable } = await makeJsPDF();
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      doc.setCharSpace(0);
      doc.setLineHeightFactor(1.3);
      doc.setR2L(false);

      const { setFont } = await ensureRoboto(doc);

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      const cari = cariler.find((c) => c._id === cariId);

      // ── HEADER ARKAPLAN BANDI ──────────────────────────────
      doc.setFillColor(30, 41, 59); // koyu lacivert
      doc.rect(0, 0, pageW, 90, "F");

      // Logo (varsa sol üst)
      if (logo) {
        try { doc.addImage(logo, "PNG", margin, 10, 65, 65); } catch {}
      }

      // Firma adı (header içinde beyaz)
      setFont("bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(company?.firmaAdi || "Firma Adı", logo ? margin + 75 : margin, 38);
      setFont("normal");
      doc.setFontSize(9);
      const subLine = [company?.vergiDairesi ? `Vergi D.: ${company.vergiDairesi}` : null,
                       company?.vergiNo ? `VKN: ${company.vergiNo}` : null,
                       company?.telefon || null,
                       company?.eposta || null].filter(Boolean).join("   |   ");
      if (subLine) doc.text(subLine, logo ? margin + 75 : margin, 54);

      // "TEKLİF" etiketi (sağ üst)
      doc.setFillColor(234, 88, 12); // turuncu
      doc.roundedRect(pageW - 145, 12, 105, 38, 4, 4, "F");
      setFont("bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("TEKLİF", pageW - 92, 37, { align: "center" });
      setFont("normal");
      doc.setFontSize(8);
      doc.text(offerNumber || "", pageW - 92, 50, { align: "center" });

      doc.setTextColor(0, 0, 0);

      // ── BİLGİ BLOKLARI ────────────────────────────────────
      let y = 108;

      // Sol: MÜŞTERİ BİLGİSİ
      const colW = (pageW - margin * 2 - 12) / 2;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, colW, 72, 4, 4, "F");
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, colW, 72, 4, 4, "S");

      setFont("bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("MÜŞTERİ BİLGİSİ", margin + 10, y + 14);
      setFont("bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const cariAd = cari
        ? cari.unvan || cari.firmaAdi || cari.ad || cari.name || "Müşteri"
        : "Müşteri Seçilmedi";
      doc.text(cariAd, margin + 10, y + 30, { maxWidth: colW - 20 });
      setFont("normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      let infoY = y + 44;
      if (cari?.telefon) { doc.text(`Tel: ${cari.telefon}`, margin + 10, infoY); infoY += 13; }
      if (cari?.eposta) doc.text(`E-posta: ${cari.eposta}`, margin + 10, infoY);

      // Sağ: TEKLİF DETAYI
      const col2X = margin + colW + 12;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(col2X, y, colW, 72, 4, 4, "F");
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(col2X, y, colW, 72, 4, 4, "S");

      setFont("bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TEKLİF BİLGİSİ", col2X + 10, y + 14);
      doc.setTextColor(15, 23, 42);
      setFont("normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR");
      const rows2 = [
        ["Teklif No:", offerNumber || "-"],
        ["Tarih:", new Date().toLocaleDateString("tr-TR")],
        ["Geçerlilik:", validUntil],
        ["Para Birimi:", currency],
      ];
      rows2.forEach(([label, val], i) => {
        doc.setTextColor(100, 116, 139);
        setFont("normal");
        doc.text(label, col2X + 10, y + 30 + i * 13);
        setFont("bold");
        doc.setTextColor(15, 23, 42);
        doc.text(val, col2X + 80, y + 30 + i * 13);
      });

      // ── ÜRÜN TABLOSU ──────────────────────────────────────
      y += 84;

      const bodyRows = (lines || []).map((it, i) => {
        const adet = Number(it.adet || 0);
        const fiyat = Number(it.fiyat || 0);
        const tutar = adet * fiyat;
        const kdvOran = Number(it.kdv || 0);
        const kdvSatir = (tutar * kdvOran) / 100;
        return [
          i + 1,
          it.urunAd || "-",
          adet,
          `${fmt(fiyat)} ${currency}`,
          `%${kdvOran}`,
          `${fmt(kdvSatir)} ${currency}`,
          `${fmt(tutar + kdvSatir)} ${currency}`,
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["#", "Ürün / Hizmet", "Adet", "Birim Fiyat", "KDV %", "KDV Tutarı", "Toplam"]],
        body: bodyRows.length > 0
          ? bodyRows
          : [[1, "-", 1, `0,00 ${currency}`, "%0", `0,00 ${currency}`, `0,00 ${currency}`]],
        styles: { fontSize: 9, cellPadding: 7, lineWidth: 0.1, lineColor: [226, 232, 240] },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          fontSize: 9,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: "center", cellWidth: 24 },
          2: { halign: "right", cellWidth: 40 },
          3: { halign: "right", cellWidth: 80 },
          4: { halign: "center", cellWidth: 45 },
          5: { halign: "right", cellWidth: 75 },
          6: { halign: "right", cellWidth: 80 },
        },
        theme: "grid",
        margin: { left: margin, right: margin },
      });

      // ── TOPLAMLAR KUTUSU ──────────────────────────────────
      y = doc.lastAutoTable.finalY + 16;
      const boxW = 200;
      const boxX = pageW - margin - boxW;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(boxX, y, boxW, 72, 4, 4, "FD");

      const totRows = [
        ["Ara Toplam", `${fmt(araToplam)} ${currency}`],
        ["KDV", `${fmt(kdvTutar)} ${currency}`],
      ];
      totRows.forEach(([label, val], i) => {
        setFont("normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(label, boxX + 12, y + 18 + i * 16);
        setFont("bold");
        doc.setTextColor(15, 23, 42);
        doc.text(val, boxX + boxW - 12, y + 18 + i * 16, { align: "right" });
      });

      // Genel toplam - turuncu çizgi + büyük yazı
      doc.setDrawColor(234, 88, 12);
      doc.setLineWidth(0.8);
      doc.line(boxX + 12, y + 51, boxX + boxW - 12, y + 51);
      setFont("bold");
      doc.setFontSize(11);
      doc.setTextColor(234, 88, 12);
      doc.text("GENEL TOPLAM", boxX + 12, y + 64);
      doc.text(`${fmt(genelToplam)} ${currency}`, boxX + boxW - 12, y + 64, { align: "right" });

      doc.setLineWidth(0.2);
      doc.setDrawColor(0);

      // ── NOT ────────────────────────────────────────────────
      if (not) {
        const notY = y + 16;
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(251, 191, 36);
        doc.roundedRect(margin, notY, boxX - margin - 12, 56, 4, 4, "FD");
        setFont("bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("NOT", margin + 10, notY + 14);
        setFont("normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(String(not), margin + 10, notY + 27, { maxWidth: boxX - margin - 32 });
      }

      // ── ONLINE ONAY LİNKİ ─────────────────────────────────
      if (savedTeklifId) {
        const origin = typeof window !== "undefined" && window.location?.origin
          ? window.location.origin : "https://www.satistakip.online";
        const onayUrl = `${origin}/teklif/onay/${savedTeklifId}?ok=1`;
        const linkY = y + 92;
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(147, 197, 253);
        doc.roundedRect(margin, linkY, pageW - margin * 2, 28, 4, 4, "FD");
        setFont("bold");
        doc.setFontSize(8);
        doc.setTextColor(30, 64, 175);
        doc.text("Online Onay Linki:", margin + 10, linkY + 12);
        setFont("normal");
        doc.setTextColor(37, 99, 235);
        doc.text(onayUrl, margin + 105, linkY + 12, { maxWidth: pageW - margin * 2 - 115 });
        doc.setTextColor(0, 0, 0);
      }

      // ── İMZA ALANI ────────────────────────────────────────
      const sigY = pageH - 100;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      // Firma imzası
      doc.line(margin, sigY + 28, margin + 140, sigY + 28);
      setFont("normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Yetkili İmza / Kaşe", margin, sigY + 38);
      doc.text(company?.firmaAdi || "", margin, sigY + 49);
      // Müşteri imzası
      const sig2X = pageW - margin - 140;
      doc.line(sig2X, sigY + 28, sig2X + 140, sigY + 28);
      doc.text("Müşteri Onayı", sig2X, sigY + 38);
      doc.text(cariAd, sig2X, sigY + 49, { maxWidth: 140 });

      // ── FOOTER ────────────────────────────────────────────
      doc.setFillColor(30, 41, 59);
      doc.rect(0, pageH - 32, pageW, 32, "F");
      setFont("normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const footerLeft = [company?.adres, company?.telefon].filter(Boolean).join("  |  ");
      const footerRight = company?.website || company?.eposta || "";
      if (footerLeft) doc.text(footerLeft, margin, pageH - 13);
      if (footerRight) doc.text(footerRight, pageW - margin, pageH - 13, { align: "right" });
      doc.setTextColor(0, 0, 0);

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

  const kalemler = buildKalemler();
  if (!kalemler.length) return alert("❌ Ürün/Hizmet kalemleri boş olamaz");

  try {
    let teklifId = savedTeklifId;

    // ✅ Eğer daha önce DB’ye kaydedilmediyse önce oluştur
    if (!teklifId) {
      const createRes = await fetch("/api/teklif/olustur", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          number: offerNumber,
          cariId,
          paraBirimi: currency,
          not,
          kalemler,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        console.error("Teklif oluşturma hatası:", createData);
        return alert("❌ Teklif oluşturulamadı: " + (createData?.message || "Sunucu hatası"));
      }

      teklifId = createData?.teklifId || createData?._id || createData?.teklif?._id;
      if (!teklifId) return alert("❌ Teklif ID alınamadı!");

      setSavedTeklifId(teklifId);
    }

    // ✅ PDF oluştur
    const pdf = await pdfOlustur(false);
    if (!pdf) return;

    // ✅ PDF'i sunucuya kaydet
    const res = await fetch("/api/teklif/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        teklifId,
        pdfBase64: pdf.base64,
        fileName: pdf.fileName,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Kaydetme hatası:", data);
      return alert("❌ PDF sunucuya kaydedilemedi: " + (data?.message || "Sunucu hatası"));
    }

    alert(
      "✅ PDF sunucuya başarıyla kaydedildi!" +
        (data?.url ? `\n📎 Dosya: ${data.url}` : data?.path ? `\n📎 Dosya: ${data.path}` : "")
    );

    // ✅ Listeyi refresh et
    const listRes = await fetch("/api/teklif/list", {
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });

    const listData = await listRes.json();
    setTeklifler(listData?.teklifler || listData?.items || []);
  } catch (err) {
    console.error("Sunucuya kaydetme hatası:", err);
    alert("❌ Sunucuya kaydetme sırasında hata oluştu.");
  }
};

  /* ───────── Mail Gönder ───────── */

const mailGonder = async () => {
  const cari = cariler.find((c) => c._id === cariId);
  if (!cari) return alert("Önce cari seçiniz.");

  // ✅ Sunucuya kaydetmeden mail göndermesin
  if (!savedTeklifId) {
    return alert("Önce ☁️ Sunucuya Kaydet yapmalısın.");
  }

  // ✅ Onay linki
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.satistakip.online";

  const onayUrl = `${origin}/teklif/onay/${savedTeklifId}?ok=1`;

  try {
    const res = await fetch("/api/teklif/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        
        teklifId: savedTeklifId,
        toEmail: cari?.eposta || cari?.email || company?.eposta,

        // ✅ Mail içeriğine onay linki
        subject: `Teklif - ${offerNumber || ""}`,
        message: `Sayın Yetkili,

Ekte teklif detaylarını bulabilirsiniz.

✅ Online Onay Linki:
${onayUrl}

İyi çalışmalar dileriz.
Kurumsal Tedarikçi`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Mail gönderim hatası:", data);
      return alert("❌ Mail gönderilemedi: " + (data?.message || "Sunucu hatası"));
    }

    alert("✅ Teklif mail olarak başarıyla gönderildi!");
  } catch (err) {

    // ✅ teklif listesini yenile
const authHeaders = getAuthHeaders();
const listRes = await fetch("/api/teklif/list", { headers: authHeaders });
const listData = await listRes.json();
setTeklifler(listData?.teklifler || []);
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
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, `Teklif-${offerNumber || "export"}.xlsx`);
  };

  /* ───────── UI ───────── */

  return (
    <RequireAuth>
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-2xl font-bold mb-3">Teklif Formu</div>

          {/* Üst Form */}
          <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm mb-1 font-medium">Cari</div>
                <select
                  className="border rounded w-full px-2 py-2"
                  value={cariId}
                  onChange={(e) => setCariId(e.target.value)}
                >
                  <option value="">Seçiniz...</option>
                  {cariler.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.unvan || c.firmaAdi || c.ad || c.name || "-"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm mb-1 font-medium">Para Birimi</div>
                <select
                  className="border rounded w-full px-2 py-2"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {["TL", "USD", "EUR"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm mb-1 font-medium">Logo</div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoPick}
                  className="border rounded w-full px-2 py-2"
                />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm mb-1 font-medium">Not</div>
              <textarea
                className="border rounded w-full px-2 py-2"
                rows={3}
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Teklife not ekleyin..."
              />
            </div>

            {/* Satırlar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Ürün / Hizmet Satırları</div>
                <button
                  onClick={addLine}
                  className="px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700"
                >
                  + Satır Ekle
                </button>
              </div>

              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Ürün</th>
                      <th className="px-3 py-2 text-right">Adet</th>
                      <th className="px-3 py-2 text-right">Birim Fiyat</th>
                      <th className="px-3 py-2 text-right">KDV</th>
                      <th className="px-3 py-2 text-right">Toplam</th>
                      <th className="px-3 py-2 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => {
                      const adet = Number(l.adet || 0);
                      const fiyat = Number(l.fiyat || 0);
                      const satir = adet * fiyat;
                      const kdv = (satir * Number(l.kdv || 0)) / 100;

                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2 min-w-[220px]">
                            <select
                              value={l.urunId}
                              onChange={(e) => selectProduct(idx, e.target.value)}
                              className="border rounded px-2 py-1 w-full text-sm"
                            >
                              <option value="">— Listeden seç —</option>
                              {urunler.map((u) => (
                                <option key={u._id || u.id} value={u._id || u.id}>
                                  {u.ad || u.name || u.urunAd || u.title || u.urunAdi || "-"}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={l.urunAd}
                              onChange={(e) => updateLine(idx, "urunAd", e.target.value)}
                              className="mt-1 border rounded px-2 py-1 w-full text-sm"
                              placeholder="veya ürün / hizmet adı yaz..."
                            />
                          </td>

                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={l.adet}
                              onChange={(e) => updateLine(idx, "adet", e.target.value)}
                              className="border rounded px-2 py-1 w-24 text-right"
                              min={0}
                            />
                          </td>

                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={l.fiyat}
                              onChange={(e) => updateLine(idx, "fiyat", e.target.value)}
                              className="border rounded px-2 py-1 w-32 text-right"
                              min={0}
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

              {/* Toplamlar */}
              <div className="text-right font-semibold text-lg mt-3">
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
        {teklifler.map((t) => (
          <tr key={t._id || t.id} className="border-t">
            {/* Tarih */}
            <td className="p-2">
              {t.createdAt || t.tarih
                ? new Date(t.createdAt || t.tarih).toLocaleDateString("tr-TR")
                : "-"}
            </td>

            {/* ✅ Cari */}
            <td className="p-2">
              {t.cariUnvan || t.cariAdi || t.cariName || t.cari || "-"}
            </td>

            {/* ✅ Durum Badge */}
            <td className="p-2">{renderStatusBadge(t.status)}</td>

            {/* ✅ Teklif No */}
            <td className="p-2">{t.number || t.offerNumber || "-"}</td>

            {/* ✅ Satır sayısı */}
            <td className="p-2 text-right">
              {(t.kalemler || t.lines || []).length}
            </td>

            {/* ✅ Genel Toplam */}
            <td className="p-2 text-right">
              {fmt(
                t.genelToplam ||
                  t?.totals?.genelToplam ||
                  t?.totals?.genelTotal ||
                  0
              )}{" "}
              {t.paraBirimi || t.currency || currency}
            </td>

            {/* İşlem */}
            <td className="p-2 text-right">
              <button
                onClick={() => loadTeklifToForm(t)}
                className="text-blue-600 underline"
              >
                Revize
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>

            

          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
