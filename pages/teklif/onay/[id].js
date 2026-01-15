import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function TeklifOnay() {
  const router = useRouter();
  const { id } = router.query;

  const [teklif, setTeklif] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Teklifi çek
  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/teklif/view?id=${id}`);
      const data = await res.json();
      if (res.ok) setTeklif(data?.teklif || null);
    })();
  }, [id]);

  const approve = async () => {
    setLoading(true);
    const res = await fetch("/api/teklif/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teklifId: id, action: "approve" }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return alert(data?.message || "Hata");
    alert("✅ Teklif onaylandı. Teşekkürler!");
  };

  const revise = async () => {
    setLoading(true);
    const res = await fetch("/api/teklif/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teklifId: id, action: "revise", note }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return alert(data?.message || "Hata");
    alert("✅ Revize talebiniz alındı.");
  };

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto", fontFamily: "Arial" }}>
      <h2>📄 Teklif Onay Sayfası</h2>

      {!teklif ? (
        <p>Teklif yükleniyor...</p>
      ) : (
        <>
          <p>
            <b>Cari:</b> {teklif.cariUnvan || "-"}
          </p>
          <p>
            <b>Teklif No:</b> {teklif.number || "-"}
          </p>
          <p>
            <b>Genel Toplam:</b> {teklif.genelToplam} {teklif.paraBirimi}
          </p>

          {teklif.pdfUrl && (
            <p>
              <a href={teklif.pdfUrl} target="_blank">📎 PDF Görüntüle</a>
            </p>
          )}

          <hr />

          <button
            disabled={loading}
            onClick={approve}
            style={{ padding: 10, background: "green", color: "white", border: "none", marginRight: 10 }}
          >
            ✅ Onayla
          </button>

          <button
            disabled={loading}
            onClick={revise}
            style={{ padding: 10, background: "orange", color: "white", border: "none" }}
          >
            ✍️ Revize İste
          </button>

          <div style={{ marginTop: 15 }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Revize açıklaması yazın..."
              rows={4}
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
