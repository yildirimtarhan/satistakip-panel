// pages/dashboard/hepsiburada/index.js
import { useEffect, useState, useMemo } from "react";

const pageWrap = { padding: "24px" };
const card = {
  maxWidth: 1100,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
};
const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid #f1f5f9",
};
const h1 = { fontSize: 20, fontWeight: 700, color: "#334155" };
const bar = { display: "flex", gap: 10, alignItems: "center" };
const input = {
  height: 36,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "0 10px",
};
const btn = {
  height: 36,
  borderRadius: 8,
  padding: "0 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};
const table = { width: "100%", borderCollapse: "collapse" };
const th = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  color: "#64748b",
  borderBottom: "1px solid #f1f5f9",
};
const td = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#334155",
  borderBottom: "1px solid #f8fafc",
  verticalAlign: "top",
};
const pill = (bg, fg) => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  background: bg,
  color: fg,
});

export default function HepsiburadaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Basit tarih aralığı (son 20 gün)
  const [begin, setBegin] = useState(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString().slice(0, 10)
  );
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));

  // ✅ LOCAL DB'den çekiyoruz — webhook sonrası gelen siparişler
  const fetchOrders = async () => {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/hepsiburada-api/orders/local`);
      const data = await res.json();

      if (res.ok && data.orders?.length) {
        setOrders(data.orders);
      } else {
        setOrders([]);
        setErr("Bu tarih aralığında sipariş bulunamadı.");
      }
    } catch (e) {
      setOrders([]);
      setErr(e.message || "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Takip linki
  const buildTrackingLink = (o) =>
    o?.data?.trackingNumber
      ? `https://kargotakip.hepsiburada.com/?trackingNumber=${encodeURIComponent(
          o.data.trackingNumber
        )}`
      : "";

  const topCount = useMemo(() => orders.length, [orders]);

  return (
    <div style={pageWrap}>
      <div style={card}>
        <div style={header}>
          <h1 style={h1}>Hepsiburada Siparişleri</h1>
          <div style={bar}>
            <input type="date" value={begin} onChange={(e) => setBegin(e.target.value)} style={input} />
            <span>—</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={input} />
            <button onClick={fetchOrders} style={btn}>Yenile</button>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {loading && <div>⏳ Yükleniyor…</div>}

          {!loading && err && (
            <div style={{ ...pill("#FEF3C7", "#92400E"), marginBottom: 12 }}>
              {err}
            </div>
          )}

          {!loading && !err && topCount === 0 && (
            <div style={{ ...pill("#E2E8F0", "#334155") }}>
              Bu aralıkta sipariş bulunamadı.
            </div>
          )}

          {!loading && topCount > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Sipariş No</th>
                    <th style={th}>Durum</th>
                    <th style={th}>Geldigi Tarih</th>
                    <th style={th}>Kargo</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const order = o.data || o;
                    return (
                      <tr key={i}>
                        <td style={td}>{order.orderNumber}</td>
                        <td style={td}>
                          <span style={pill("#E5E7EB", "#111827")}>
                            {order.status || "—"}
                          </span>
                        </td>
                        <td style={td}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleString("tr-TR") : "—"}
                        </td>
                        <td style={td}>
                          {buildTrackingLink(o) ? (
                            <a
                              href={buildTrackingLink(o)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ ...pill("#DBEAFE", "#1D4ED8"), textDecoration: "none" }}
                            >
                              Kargo Takip
                            </a>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 13 }}>
                              takip yok
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
