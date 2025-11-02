// /pages/teklif/onay/[id].js
import { useEffect, useState } from "react";

export default function TeklifOnay() {
  const [teklif, setTeklif] = useState(null);
  const [status, setStatus] = useState("loading");
  const [rejectReason, setRejectReason] = useState("");

  const updateStatus = async (newStatus) => {
    const body = { id: teklif._id, status: newStatus };

    if (newStatus === "Reddedildi") {
      body.rejectReason = rejectReason;
      if (!rejectReason.trim()) return alert("Lütfen red sebebi yazın.");
    }

    const r = await fetch("/api/teklif/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) return alert("Bir hata oluştu.");
    setStatus(newStatus);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.pathname.split("/").pop();
    const ok = url.searchParams.get("ok") === "1";

    if (!id || !ok) {
      setStatus("invalid");
      return;
    }

    (async () => {
      const r = await fetch(`/api/teklif/get?id=${id}`);
      if (!r.ok) return setStatus("notfound");
      const data = await r.json();
      setTeklif(data);
      setStatus(data.status);
    })();
  }, []);

  if (status === "loading") return <Center>Yükleniyor...</Center>;
  if (status === "invalid") return <Center>❌ Geçersiz bağlantı</Center>;
  if (status === "notfound") return <Center>❌ Teklif bulunamadı</Center>;

  // Teklif önceden işlendiyse mesaj göster
  if (status === "Onaylandı") return <Center>✅ Bu teklif zaten onaylandı</Center>;
  if (status === "Reddedildi") return <Center>❌ Teklif reddedilmiş</Center>;

  const w = teklif?.cariAd
    ? `Merhaba, teklifinizi aldım: ${teklif.number}`
    : "Merhaba, teklifinizi aldım.";

  const wa = `https://wa.me/90${(teklif?.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(w)}`;

  return (
    <Center>
      <div style={{padding:24,border:"1px solid #eee",borderRadius:12,maxWidth:500}}>
        <h2>Teklif Onay</h2>
        <p><b>Firma:</b> {teklif?.cariAd}</p>
        <p><b>Teklif No:</b> {teklif?.number}</p>
        <p><b>Toplam:</b> {teklif?.totals?.genelToplam} TL</p>
        <p><b>Geçerlilik:</b> {new Date(teklif?.validUntil).toLocaleDateString("tr-TR")}</p>

        <button
          onClick={() => updateStatus("Onaylandı")}
          style={btnGreen}
        >
          ✅ Teklifi Onayla
        </button>

        <div style={{marginTop:12}}>
          <textarea
            placeholder="Red sebebi..."
            value={rejectReason}
            onChange={(e)=>setRejectReason(e.target.value)}
            style={{width:"100%",minHeight:70,padding:8}}
          />
          <button
            onClick={() => updateStatus("Reddedildi")}
            style={btnRed}
          >
            ❌ Teklifi Reddet
          </button>
        </div>

        {teklif?.phone && (
          <a href={wa} style={btnWhatsapp}>
            💬 WhatsApp ile Bilgilendir
          </a>
        )}
      </div>
    </Center>
  );
}

const Center = ({children}) => (
  <div style={{minHeight:"70vh",display:"flex",justifyContent:"center",alignItems:"center"}}>
    {children}
  </div>
);

const btnBase = {
  padding:"10px 18px",
  borderRadius:6,
  border:"none",
  cursor:"pointer",
  width:"100%",
  marginTop:8,
  fontSize:16
};

const btnGreen = {...btnBase, background:"#17b169", color:"#fff"};
const btnRed = {...btnBase, background:"#cc0000", color:"#fff"};
const btnWhatsapp = {
  ...btnBase,
  background:"#25D366",
  color:"#fff",
  display:"block",
  textAlign:"center",
  textDecoration:"none"
};
