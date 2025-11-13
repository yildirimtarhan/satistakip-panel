// /pages/teklif/onay/[id].js
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function TeklifOnay() {
  const [teklif, setTeklif] = useState(null);
  const [status, setStatus] = useState("loading");
  const [rejectReason, setRejectReason] = useState("");
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.pathname.split("/").pop();
    const token = url.searchParams.get("token");

    if (!id || !token) {
      setStatus("invalid");
      return;
    }

    (async () => {
      try {
        const r = await fetch(`/api/teklif/get?id=${id}&token=${token}`);
        if (!r.ok) return setStatus("notfound");

        const data = await r.json();
        setTeklif(data);
        setStatus(data.status || "Bekliyor");

        // ✔ QR KOD bağlatı URL’si
        const qr = await QRCode.toDataURL(window.location.href);
        setQrData(qr);
      } catch (err) {
        console.error("QR veya veri hatası:", err);
        setStatus("invalid");
      }
    })();
  }, []);

  const updateStatus = async (newStatus) => {
    if (!teklif) return;

    const body = {
      id: teklif._id,
      token: teklif.token,
      status: newStatus,
    };

    if (newStatus === "Reddedildi") {
      if (!rejectReason.trim()) return alert("Lütfen red sebebi yazın.");
      body.rejectReason = rejectReason;
    }

    const r = await fetch("/api/teklif/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) return alert("Bir hata oluştu.");
    setStatus(newStatus);
  };

  // Durumlar
  if (status === "loading") return <Center>Yükleniyor...</Center>;
  if (status === "invalid") return <Center>❌ Geçersiz bağlantı</Center>;
  if (status === "notfound") return <Center>❌ Teklif bulunamadı</Center>;
  if (status === "Onaylandı") return <Center>✅ Bu teklif zaten onaylanmış</Center>;
  if (status === "Reddedildi") return <Center>❌ Bu teklif daha önce reddedilmiş</Center>;

  const cari = teklif?.cariAd || "Müşteri";

  // WhatsApp mesajı
  const waPhone = (teklif?.phone || "")
    .replace(/\D/g, "")
    .replace(/^0/, "");

  const waText = `Teklifinizi aldım. Teklif No: ${teklif.number}`;
  const waUrl = `https://wa.me/90${waPhone}?text=${encodeURIComponent(waText)}`;

  return (
    <Center>
      <div style={panel}>
        {/* QR KOD */}
        {qrData && (
          <img
            src={qrData}
            alt="QR"
            style={{
              width: 120,
              margin: "0 auto 12px",
              display: "block",
              borderRadius: 8
            }}
          />
        )}

        <h2 style={{ textAlign: "center", marginBottom: 10 }}>Teklif Onay</h2>

        <p><b>Firma:</b> {cari}</p>
        <p><b>Teklif No:</b> {teklif.number}</p>
        <p><b>Toplam:</b> {teklif.totals.genelToplam} {teklif.currency || "₺"}</p>
        <p><b>Geçerlilik:</b> {new Date(teklif.validUntil).toLocaleDateString("tr-TR")}</p>

        <hr style={{ margin: "14px 0" }} />

        {/* ONAY BUTTON */}
        <button onClick={() => updateStatus("Onaylandı")} style={btnGreen}>
          ✅ Teklifi Onayla
        </button>

        {/* RED SEBEBİ */}
        <textarea
          placeholder="Red sebebi yazın..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={textarea}
        />

        <button onClick={() => updateStatus("Reddedildi")} style={btnRed}>
          ❌ Teklifi Reddet
        </button>

        {/* WhatsApp */}
        {waPhone && (
          <a href={waUrl} target="_blank" style={btnWhatsapp}>
            💬 WhatsApp ile Bilgilendir
          </a>
        )}
      </div>
    </Center>
  );
}

// --- Tasarım ---
const Center = ({ children }) => (
  <div style={{
    minHeight: "80vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    background: "#f9fafb"
  }}>
    {children}
  </div>
);

const panel = {
  padding: 24,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  maxWidth: 450,
  width: "100%",
  background: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
};

const textarea = {
  width: "100%",
  minHeight: 80,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  marginTop: 12,
  resize: "vertical",
  fontSize: 15
};

const btnBase = {
  padding: "12px 18px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  width: "100%",
  marginTop: 10,
  fontSize: 16,
  fontWeight: 600
};

const btnGreen = { ...btnBase, background: "#16a34a", color: "#fff" };
const btnRed = { ...btnBase, background: "#dc2626", color: "#fff" };
const btnWhatsapp = {
  ...btnBase,
  background: "#25D366",
  color: "#fff",
  textAlign: "center",
  display: "block"
};
