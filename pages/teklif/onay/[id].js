import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function TeklifOnay() {
  const router = useRouter();
  const { id, ok, revize } = router.query;

  const [teklif, setTeklif] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  // ✅ Teklifi çek (JSON endpoint)
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(`/api/teklif/public?id=${id}`);
        const data = await res.json();

        if (res.ok && data?.ok) {
          setTeklif(data?.teklif || null);
        } else {
          setTeklif(null);
        }
      } catch (err) {
        console.error("Teklif yükleme hatası:", err);
        setTeklif(null);
      }
    })();
  }, [id]);

  // ✅ Link ile otomatik onay (ok=1 ise)
  useEffect(() => {
    if (!id) return;
    if (!ok) return;

    // otomatik onay (bir kez)
    approve(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ok]);

  const approve = async (isAuto = false) => {
    setLoading(true);
    setDoneMessage("");

    try {
      const res = await fetch("/api/teklif/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teklifId: id, action: "approve" }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        if (!isAuto) alert(data?.message || "Hata");
        return;
      }

      setDoneMessage("✅ Teklif onaylandı. Teşekkür ederiz 🙏");

      // ✅ ekrandaki status’u da güncelle
      setTeklif((prev) => (prev ? { ...prev, status: "onaylandi" } : prev));
    } catch (err) {
      setLoading(false);
      if (!isAuto) alert("Sunucu hatası oluştu.");
    }
  };

  const revise = async () => {
    if (!note.trim()) {
      return alert("Revize açıklaması yazmalısınız.");
    }

    setLoading(true);
    setDoneMessage("");

    try {
      const res = await fetch("/api/teklif/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teklifId: id, action: "revise", note }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) return alert(data?.message || "Hata");

      setDoneMessage("✅ Revize talebiniz alındı. En kısa sürede geri dönüş yapılacaktır.");
      setNote("");

      // ✅ ekrandaki status’u da güncelle
      setTeklif((prev) =>
        prev ? { ...prev, status: "revize_istendi", revisionNote: note } : prev
      );
    } catch (err) {
      setLoading(false);
      alert("Sunucu hatası oluştu.");
    }
  };

  const formatMoney = (val) => {
    if (val === undefined || val === null) return "-";
    return Number(val).toLocaleString("tr-TR");
  };

  // ✅ PDF Link (her zaman server’da üretilen PDF)
  const pdfLink = id ? `/api/teklif/view?id=${id}` : "#";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px 15px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          background: "white",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 10px 25px rgba(0,0,0,0.07)",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>📄 Teklif Onay Sayfası</h2>
          <p style={{ marginTop: 6, color: "#666", fontSize: 14 }}>
            Lütfen teklifi inceleyip onaylayabilir ya da revize talebi oluşturabilirsiniz.
          </p>
        </div>

        {!teklif ? (
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              background: "#f3f6ff",
              color: "#333",
              textAlign: "center",
              fontSize: 15,
            }}
          >
            ⏳ Teklif yükleniyor...
          </div>
        ) : (
          <>
            {/* TEKLIF BILGI KARTI */}
            <div
              style={{
                background: "#fbfbfb",
                border: "1px solid #eee",
                padding: 18,
                borderRadius: 12,
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <InfoBox label="Cari Ünvan" value={teklif.cariUnvan || "-"} />
                <InfoBox label="Teklif No" value={teklif.number || "-"} />
                <InfoBox
                  label="Genel Toplam"
                  value={`${formatMoney(teklif.genelToplam)} ${teklif.paraBirimi || ""}`}
                />
                <InfoBox label="Durum" value={teklif.status || "-"} />
              </div>

              {/* PDF BUTONU */}
              <div style={{ marginTop: 14 }}>
                <a
                  href={pdfLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#0b5fff",
                    color: "white",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  📎 PDF Görüntüle
                </a>
              </div>
            </div>

            {/* BUTONLAR */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                disabled={loading}
                onClick={() => approve(false)}
                style={{
                  padding: "12px 16px",
                  background: loading ? "#9ad0a2" : "#1aa34a",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer",
                  minWidth: 160,
                }}
              >
                ✅ Onayla
              </button>

              <button
                disabled={loading}
                onClick={revise}
                style={{
                  padding: "12px 16px",
                  background: loading ? "#ffd3a1" : "#ff8a00",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer",
                  minWidth: 160,
                }}
              >
                ✍️ Revize İste
              </button>
            </div>

            {/* REVIZE NOTU */}
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 13, fontWeight: "bold", color: "#333" }}>
                Revize Açıklaması
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn: Fiyat güncellenebilir mi? Teslim süresi değişebilir mi?"
                rows={4}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  outline: "none",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
              <p style={{ marginTop: 6, color: "#777", fontSize: 12 }}>
                Not: Revize talebiniz ekibimize iletilecektir.
              </p>
            </div>

            {/* SONUC MESAJI */}
            {doneMessage && (
              <div
                style={{
                  marginTop: 14,
                  background: "#eafff0",
                  border: "1px solid #bde7c9",
                  padding: 12,
                  borderRadius: 10,
                  color: "#146c2e",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                {doneMessage}
              </div>
            )}
          </>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
            Otomatik gönderim • Kurumsal Tedarikçi
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        flex: "1 1 220px",
        background: "white",
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: "bold", color: "#222" }}>{value}</div>
    </div>
  );
}
