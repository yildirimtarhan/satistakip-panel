// pages/dashboard/hepsiburada/orders/index.js
import { useEffect, useState, useMemo } from "react";
import { FaturaModal } from "@/components/pazaryeri/FaturaModal";

const pageWrap = { padding: "24px", maxWidth: 1280, margin: "0 auto" };
const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : ""}`,
});

// ——— Stil sabitleri ———
const card = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
const cardHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid #f1f5f9",
};
const sectionTitle = { fontSize: 15, fontWeight: 600, color: "#334155" };
const input = {
  height: 38,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 14,
};
const btnPrimary = {
  height: 38,
  borderRadius: 8,
  padding: "0 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};
const btnSecondary = {
  ...btnPrimary,
  background: "#f1f5f9",
  color: "#475569",
};
const btnSuccess = {
  ...btnPrimary,
  background: "#059669",
};

// Durum etiketleri (HB status → renk)
const STATUS_STYLE = {
  AwaitingShipment: { bg: "#FEF3C7", color: "#92400E" },
  Shipped: { bg: "#DBEAFE", color: "#1D4ED8" },
  InTransit: { bg: "#E0E7FF", color: "#4338CA" },
  Delivered: { bg: "#D1FAE5", color: "#065F46" },
  DeliveryDeliveredV2: { bg: "#D1FAE5", color: "#065F46" },
  DeliveryShippedV2: { bg: "#DBEAFE", color: "#1D4ED8" },
  Undelivered: { bg: "#FEE2E2", color: "#991B1B" },
  DeliveryUndeliveredV2: { bg: "#FEE2E2", color: "#991B1B" },
  Cancelled: { bg: "#F1F5F9", color: "#64748B" },
  CancelOrderLineV2: { bg: "#F1F5F9", color: "#64748B" },
};

function getStatusStyle(status) {
  if (!status) return { bg: "#f1f5f9", color: "#64748b" };
  const s = String(status);
  return STATUS_STYLE[s] || { bg: "#E2E8F0", color: "#475569" };
}

// Hepsiburada panelindeki sipariş süreci sekmeleri (durum → sekme eşlemesi)
const PROCESS_TABS = [
  { id: "all", label: "Tümü" },
  { id: "Paketlenecek", label: "Paketlenecek", statuses: ["AwaitingShipment", "OrderCreated", "OrderCreate", "CreateOrderV2"] },
  { id: "Gönderime hazır", label: "Gönderime hazır", statuses: ["ReadyToShip", "DeliveryCreated"] },
  { id: "Kargoda", label: "Kargoda", statuses: ["Shipped", "InTransit", "DeliveryShippedV2"] },
  { id: "Teslim edildi", label: "Teslim edildi", statuses: ["Delivered", "DeliveryDeliveredV2"] },
  { id: "Teslim edilemedi", label: "Teslim edilemedi", statuses: ["Undelivered", "DeliveryUndeliveredV2"] },
  { id: "Ödemesi bekleniyor", label: "Ödemesi bekleniyor", statuses: ["PaymentAwaiting"] },
  { id: "İptal edildi", label: "İptal edildi", statuses: ["Cancelled", "CancelOrderLineV2", "OrderCancelled"] },
];

export default function HepsiburadaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [createTestLoading, setCreateTestLoading] = useState(false);
  const [createTestResult, setCreateTestResult] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [processTab, setProcessTab] = useState("all");
  const [pushErpLoading, setPushErpLoading] = useState(false);
  const [pushErpResult, setPushErpResult] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [faturaOrderNumber, setFaturaOrderNumber] = useState(null);

  const [begin, setBegin] = useState(
    () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)
  );
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchOrders = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/hepsiburada-api/orders/local`);
      const data = await res.json();
      if (res.ok && data.orders?.length) {
        setOrders(data.orders);
      } else {
        setOrders(data.orders || []);
        if (!data.orders?.length) setErr("Henüz sipariş yok. Test siparişi oluşturabilirsiniz.");
      }
    } catch (e) {
      setOrders([]);
      setErr(e.message || "Liste yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const createTestOrder = async () => {
    setCreateTestLoading(true);
    setCreateTestResult(null);
    try {
      const res = await fetch("/api/hepsiburada/orders/create-test", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setCreateTestResult(data);
      if (data.success) setTimeout(() => fetchOrders(), 1500);
    } catch (e) {
      setCreateTestResult({ success: false, message: e.message });
    }
    setCreateTestLoading(false);
  };

  const pushToErp = async () => {
    setPushErpLoading(true);
    setPushErpResult(null);
    try {
      const orderNumbers = orders.map((o) => getOrderDisplay(o).orderNumber).filter(Boolean);
      const res = await fetch("/api/hepsiburada/orders/push-erp", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ orderNumbers }),
      });
      const data = await res.json();
      setPushErpResult(data);
      if (data.success) setTimeout(() => fetchOrders(), 500);
    } catch (e) {
      setPushErpResult({ success: false, message: e.message });
    }
    setPushErpLoading(false);
  };

  const seedTestData = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/hepsiburada/orders/seed-test-data", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSeedResult(data);
      if (data.success) setTimeout(() => fetchOrders(), 500);
    } catch (e) {
      setSeedResult({ success: false, message: e.message });
    }
    setSeedLoading(false);
  };

  const buildTrackingLink = (o) => {
    const tn = o?.trackingNumber ?? o?.raw?.shipmentTrackingNumber ?? o?.data?.shipmentTrackingNumber;
    return tn
      ? `https://kargotakip.hepsiburada.com/?trackingNumber=${encodeURIComponent(tn)}`
      : "";
  };

  const getOrderDisplay = (o) => ({
    orderNumber: o?.orderNumber ?? o?.raw?.orderNumber ?? o?.data?.orderNumber ?? "—",
    status: o?.status ?? o?.raw?.status ?? o?.data?.orderStatus ?? "—",
    updatedAt: o?.updatedAt ?? o?.raw?.lastStatusUpdateDate ?? o?.fetchedAt ?? o?.createdAt,
    trackingNumber: o?.trackingNumber ?? o?.raw?.shipmentTrackingNumber ?? o?.data?.shipmentTrackingNumber,
  });

  // Filtreleme (sipariş süreci sekmesi + arama + durum)
  const filteredOrders = useMemo(() => {
    let list = orders;
    const tab = PROCESS_TABS.find((t) => t.id === processTab);
    if (tab?.statuses?.length) {
      const set = new Set(tab.statuses);
      list = list.filter((o) => {
        const d = getOrderDisplay(o);
        return set.has(String(d.status));
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) => {
        const d = getOrderDisplay(o);
        return d.orderNumber.toLowerCase().includes(q);
      });
    }
    if (statusFilter) {
      list = list.filter((o) => {
        const d = getOrderDisplay(o);
        return String(d.status).toLowerCase() === statusFilter.toLowerCase();
      });
    }
    return list;
  }, [orders, search, statusFilter, processTab]);

  const statusCounts = useMemo(() => {
    const m = {};
    orders.forEach((o) => {
      const s = getOrderDisplay(o).status || "—";
      m[s] = (m[s] || 0) + 1;
    });
    return m;
  }, [orders]);

  // Tüm sipariş süreci sekmeleri için adet (tablo için)
  const processTabCounts = useMemo(() => {
    return PROCESS_TABS.map((tab) => {
      if (tab.id === "all") return { ...tab, count: orders.length };
      const set = new Set(tab.statuses || []);
      const count = orders.filter((o) => set.has(String(getOrderDisplay(o).status))).length;
      return { ...tab, count };
    });
  }, [orders]);

  const uniqueStatuses = useMemo(() => [...new Set(orders.map((o) => getOrderDisplay(o).status).filter(Boolean))], [orders]);

  return (
    <div style={pageWrap}>
      {/* Sayfa başlığı */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
          Hepsiburada Siparişleri
        </h1>
        <p style={{ fontSize: 14, color: "#64748b" }}>
          Webhook ile gelen siparişler burada listelenir. Test siparişi oluşturabilir veya listeyi yenileyebilirsiniz.
        </p>
      </div>

      {/* Sipariş süreci sekmeleri (HB panel ile uyumlu) */}
      {!loading && orders.length > 0 && (
        <div style={{ ...card, padding: "0 4px", marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 12px" }}>
            {PROCESS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setProcessTab(t.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: processTab === t.id ? "#F97316" : "transparent",
                  color: processTab === t.id ? "#fff" : "#64748b",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tüm sipariş süreci sekmeleri — adet tablosu */}
      {!loading && orders.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ ...cardHeader, borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={sectionTitle}>Sipariş süreci özeti</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                    Süreç
                  </th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", width: 100 }}>
                    Adet
                  </th>
                </tr>
              </thead>
              <tbody>
                {processTabCounts.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: processTab === row.id ? "#FFF7ED" : undefined,
                    }}
                  >
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{row.label}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: processTab === row.id ? "#EA580C" : "#0f172a" }}>
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kurulum ve test (açılır/kapanır) */}
      <div style={{ ...card, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setSetupOpen((v) => !v)}
          style={{
            ...cardHeader,
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={sectionTitle}>Kurulum ve test</span>
          <span style={{ fontSize: 18, color: "#64748b" }}>{setupOpen ? "−" : "+"}</span>
        </button>
        {setupOpen && (
          <div style={{ padding: 20, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  Manuel test siparişi
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                  Test ortamında Hepsiburada STUB’a örnek sipariş gönderir; webhook ile panelde görünür.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={createTestOrder}
                    disabled={createTestLoading}
                    style={{ ...btnSuccess, opacity: createTestLoading ? 0.7 : 1 }}
                  >
                    {createTestLoading ? "Oluşturuluyor…" : "Test siparişi oluştur"}
                  </button>
                  <button
                    type="button"
                    onClick={seedTestData}
                    disabled={seedLoading}
                    style={{ ...btnSecondary, opacity: seedLoading ? 0.7 : 1 }}
                  >
                    {seedLoading ? "Ekleniyor…" : "Örnek test verisi (2 yeni + 7 kargoda/teslim)"}
                  </button>
                </div>
                {seedResult && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      background: seedResult.success ? "#D1FAE5" : "#FEE2E2",
                      color: seedResult.success ? "#065F46" : "#991B1B",
                    }}
                  >
                    {seedResult.message}
                  </div>
                )}
                {createTestResult && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      background: createTestResult.success ? "#D1FAE5" : "#FEE2E2",
                      color: createTestResult.success ? "#065F46" : "#991B1B",
                    }}
                  >
                    {createTestResult.success
                      ? `Sipariş no: ${createTestResult.orderNumber}. ${createTestResult.message}`
                      : createTestResult.message}
                  </div>
                )}
              </div>
              <div style={{ flex: "1 1 280px", background: "#f8fafc", borderRadius: 8, padding: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  Webhook bilgisi
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  URL:{" "}
                  <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/hepsiburada-api/orders/webhook`
                      : "/api/hepsiburada-api/orders/webhook"}
                  </code>
                </p>
                <p style={{ fontSize: 12, color: "#64748b" }}>
                  .env’de <code>HB_WEBHOOK_USERNAME</code> ve <code>HB_WEBHOOK_PASSWORD</code> tanımlayın; aynı bilgiyi Hepsiburada’ya iletin.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sipariş listesi kartı */}
      <div style={card}>
        <div style={cardHeader}>
          <h2 style={sectionTitle}>Sipariş listesi</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={pushToErp}
              disabled={pushErpLoading || loading}
              style={{ ...btnSuccess, opacity: pushErpLoading ? 0.7 : 1 }}
            >
              {pushErpLoading ? "Aktarılıyor…" : "ERP'ye aktar"}
            </button>
            <input
              type="text"
              placeholder="Sipariş no ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...input, width: 180 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ ...input, width: 160 }}
            >
              <option value="">Tüm durumlar</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input type="date" value={begin} onChange={(e) => setBegin(e.target.value)} style={{ ...input, width: 140 }} />
            <span style={{ color: "#94a3b8", fontSize: 14 }}>–</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ ...input, width: 140 }} />
            <button type="button" onClick={fetchOrders} disabled={loading} style={btnPrimary}>
              Yenile
            </button>
          </div>
        </div>
        {pushErpResult && (
          <div
            style={{
              padding: "10px 20px",
              fontSize: 13,
              background: pushErpResult.success ? "#D1FAE5" : "#FEE2E2",
              color: pushErpResult.success ? "#065F46" : "#991B1B",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            {pushErpResult.success
              ? (pushErpResult.message || "") + (pushErpResult.salesCreated ? ` ${pushErpResult.salesCreated} satış oluşturuldu.` : "")
              : pushErpResult.message}
          </div>
        )}

        <div style={{ padding: "0 20px 20px" }}>
          {loading && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#64748b" }}>
              <div style={{ marginBottom: 12 }}>⏳ Yükleniyor…</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "100%",
                      maxWidth: 400,
                      height: 52,
                      background: "#f1f5f9",
                      borderRadius: 8,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && err && (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                background: "#FFFBEB",
                border: "1px solid #FCD34D",
                color: "#92400E",
                fontSize: 14,
              }}
            >
              {err}
            </div>
          )}

          {!loading && !err && filteredOrders.length === 0 && (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px dashed #e2e8f0",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Sipariş bulunamadı
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
                Bu filtrede sipariş yok. Tarih aralığını genişletin veya test siparişi oluşturun.
              </div>
              <button type="button" onClick={() => setSetupOpen(true)} style={btnSecondary}>
                Kurulum ve test
              </button>
            </div>
          )}

          {!loading && filteredOrders.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      Sipariş no
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      Durum
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      Son güncelleme
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      Kargo
                    </th>
                    <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      Etiket
                    </th>
                    <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      ERP
                    </th>
                    <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      Fatura
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o, i) => {
                    const d = getOrderDisplay(o);
                    const link = buildTrackingLink(o);
                    const style = getStatusStyle(d.status);
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fafafa"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                      >
                        <td style={{ padding: "14px 16px", color: "#0f172a", fontFamily: "ui-monospace, monospace" }}>
                          {d.orderNumber}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: style.bg,
                              color: style.color,
                            }}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#475569" }}>
                          {d.updatedAt
                            ? new Date(d.updatedAt).toLocaleString("tr-TR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                background: "#DBEAFE",
                                color: "#1D4ED8",
                                textDecoration: "none",
                              }}
                            >
                              Takip
                            </a>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <a
                            href={`/api/hepsiburada/orders/kargo-etiket?orderNumber=${encodeURIComponent(d.orderNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#EA580C",
                              textDecoration: "none",
                            }}
                          >
                            Etiket
                          </a>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          {o.erpPushed ? (
                            <span style={{ fontSize: 12, color: "#065F46", fontWeight: 500 }} title={o.erpSaleNo || ""}>✓ ERP'de</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => setFaturaOrderNumber(d.orderNumber)}
                            style={{ fontSize: 12, fontWeight: 500, color: "#EA580C", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                          >
                            E-arşiv fatura
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredOrders.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#94a3b8" }}>
              {filteredOrders.length} sipariş listeleniyor
              {search || statusFilter ? ` (filtre uygulandı)` : ""}
            </div>
          )}
        </div>
      </div>

      <FaturaModal
        open={!!faturaOrderNumber}
        onClose={() => setFaturaOrderNumber(null)}
        orderNumber={faturaOrderNumber}
        marketplace="hepsiburada"
        token={typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : ""}
      />
    </div>
  );
}
