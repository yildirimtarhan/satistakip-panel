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
      const r = await fetch(`/api/teklif/get?id=${id}&token=${token}`);
      if (!r.ok) return setStatus("notfound");

      const data = await r.json();
      setTeklif(data);
      setStatus(data.status || "Bekliyor");

      // QR Kod üret
      const qr = await QRCode.toDataURL(window.location.href);
      setQrData(qr);
    })();
  }, []);
  const updateStatus = async (newStatus) => {
    if (!teklif) return;

    const body = {
      id: teklif._id,
      token: teklif.token,
      status: newStatus,
      rejectReason: newStatus === "Reddedildi" ? rejectReason : undefined,
    };

    if (newStatus === "Reddedildi" && !rejectReason.trim()) {
      return alert("Lütfen red sebebi yazın.");
    }

    const r = await fetch("/api/teklif/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) return alert("Bir hata oluştu.");
    setStatus(newStatus);
  };
  if (status === "loading") return <Center>Yükleniyor...</Center>;
  if (status === "invalid") return <Center>❌ Geçersiz bağlantı</Center>;
  if (status === "notfound") return <Center>❌ Teklif bulunamadı</Center>;
  if (status === "Onaylandı") return <Center>✅ Bu teklif zaten onaylanmış</Center>;
  if (status === "Reddedildi") return <Center>❌ Bu teklif daha önce reddedilmiş</Center>;
  const c = teklif?.cariAd || "Müşteri";
  const waText = `Teklifinizi aldım (${teklif.number}).`;
  const waPhone = (teklif?.phone || "").replace(/\D/g, "").replace(/^0/, "");
  const wa = `https://wa.me/90${waPhone}?text=${encodeURIComponent(waText)}`;
  return (
    <Center>
      <div style={panel}>
        <img src={qrData} alt="QR" style={{ width: 120, margin: "0 auto", display: "block" }} />

        <h2 style={{textAlign:"center"}}>Teklif Onay</h2>

        <p><b>Firma:</b> {c}</p>
        <p><b>Teklif No:</b> {teklif.number}</p>
        <p><b>Toplam:</b> {teklif.totals.genelToplam} {teklif.currency}</p>
        <p><b>Geçerlilik:</b> {new Date(teklif.validUntil).toLocaleDateString("tr-TR")}</p>

        <hr style={{margin:"12px 0"}} />

        <button onClick={() => updateStatus("Onaylandı")} style={btnGreen}>
          ✅ Teklifi Onayla
        </button>

        <textarea
          placeholder="Red sebebi..."
          value={rejectReason}
          onChange={(e)=>setRejectReason(e.target.value)}
          style={textarea}
        />

        <button onClick={() => updateStatus("Reddedildi")} style={btnRed}>
          ❌ Teklifi Reddet
        </button>

        {waPhone && (
          <a href={wa} target="_blank" style={btnWhatsapp}>
            💬 WhatsApp ile Bilgilendir
          </a>
        )}
      </div>
    </Center>
  );
}
const Center = ({children}) => (
  <div style={{minHeight:"80vh",display:"flex",justifyContent:"center",alignItems:"center",padding:20}}>
    {children}
  </div>
);

const panel = {
  padding:24,
  border:"1px solid #eee",
  borderRadius:12,
  maxWidth:450,
  background:"#fff",
  boxShadow:"0 4px 12px rgba(0,0,0,0.08)"
};

const textarea = {
  width:"100%",
  minHeight:80,
  padding:8,
  borderRadius:8,
  border:"1px solid #ccc",
  marginTop:10,
  resize:"vertical"
};

const btnBase = {
  padding:"10px 18px",
  borderRadius:6,
  border:"none",
  cursor:"pointer",
  width:"100%",
  marginTop:8,
  fontSize:16,
  fontWeight:"bold"
};

const btnGreen = {...btnBase, background:"#16a34a", color:"#fff"};
const btnRed = {...btnBase, background:"#dc2626", color:"#fff"};
const btnWhatsapp = {...btnBase, background:"#25D366", color:"#fff", textAlign:"center", display:"block"};
