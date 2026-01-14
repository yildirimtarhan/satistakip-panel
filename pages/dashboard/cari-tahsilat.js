import { useEffect, useState } from "react";

export default function CariTahsilat() {
  const [cariList, setCariList] = useState([]);
  const [selectedCari, setSelectedCari] = useState(null);
  const [balance, setBalance] = useState(0);

  const [form, setForm] = useState({
    accountId: "",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    direction: "alacak",
    method: "cash",
    note: "",
  });

  const [payments, setPayments] = useState([]);

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Token al
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  // ✅ Para format
  const fmt = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ✅ ödeme yöntemi yazısı
  const formatMethod = (m) => {
    if (m === "cash") return "Nakit";
    if (m === "bank") return "Banka";
    if (m === "kart") return "Kart";
    if (m === "eft") return "EFT / Havale";
    return m || "-";
  };

  // ✅ Cari Liste (token ile)
  const loadCariList = async () => {
    try {
      const res = await fetch("/api/cari", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("❌ /api/cari error:", data);
        setCariList([]);
        return;
      }

      setCariList(Array.isArray(data) ? data : data?.cariList || []);
    } catch (e) {
      console.error("Cari load error:", e);
      setCariList([]);
    }
  };

  // ✅ token gelince carileri çek
  useEffect(() => {
    if (!token) return;
    loadCariList();
  }, [token]);

  // ✅ Bakiye çek (token ile)
  const loadBalance = async (accountId) => {
  if (!accountId) return;

  try {
    const res = await fetch(`/api/cari/balance?id=${accountId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("❌ /api/cari/balance error:", data);
      setBalance(0);
      return;
    }

   setBalance(data?.bakiye ?? data?.balance ?? 0);
  } catch (e) {
    console.error("Balance load error:", e);
    setBalance(0);
  }
};


  // ✅ Ödemeler/Tahsilatlar listesi çek (token ile)
  const loadPayments = async (accountId) => {
    if (!accountId) return;

    setListLoading(true);
    try {
      const res = await fetch(`/api/tahsilat/list?accountId=${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("❌ /api/tahsilat/list error:", data);
        setPayments([]);
        return;
      }

      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Payment list error:", e);
      setPayments([]);
    } finally {
      setListLoading(false);
    }
  };

  // ✅ Cari seçilince yükle (token hazırsa)
  useEffect(() => {
    if (!token) return;
    if (!form.accountId) return;

    console.log("✅ SELECTED ACCOUNT:", form.accountId);

    loadBalance(form.accountId);
    loadPayments(form.accountId);

    const found = Array.isArray(cariList)
      ? cariList.find((x) => x._id === form.accountId)
      : null;

    setSelectedCari(found || null);
  }, [form.accountId, token, cariList]);

  // ✅ Kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess("");

    if (!token) return setErr("Token yok, tekrar giriş yap");
    if (!form.accountId) return setErr("Cari seçmelisin");
    if (!form.amount) return setErr("Tutar giriniz");

    setLoading(true);

    try {
      const res = await fetch("/api/tahsilat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: form.accountId,
          amount: form.amount,
          direction: form.direction,
          method: form.method,
          note: form.note,
          date: form.date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "İşlem başarısız");

      setSuccess("✅ İşlem kaydedildi");

      setForm((prev) => ({
        ...prev,
        amount: "",
        note: "",
      }));

      await loadBalance(form.accountId);
      await loadPayments(form.accountId);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PDF Aç (token ile)
  const openPdfForPayment = (paymentId) => {
    if (!token || !paymentId) return;
    window.open(`/api/tahsilat/pdf?id=${paymentId}&token=${token}`, "_blank");
  };

  // ✅ Geri Al
  const cancelPayment = async (paymentId) => {
    setErr("");
    setSuccess("");

    if (!token) return setErr("Token yok, tekrar giriş yap");
    if (!paymentId) return setErr("Kayıt bulunamadı");

    const ok = confirm("Bu ödeme geri alınacak. Emin misin?");
    if (!ok) return;

    try {
      const reason = prompt("Geri alma sebebi (isteğe bağlı):") || "";

      const res = await fetch("/api/tahsilat/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId, reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Geri alınamadı");

      setSuccess("✅ Ödeme geri alındı");
      await loadBalance(form.accountId);
      await loadPayments(form.accountId);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Cari Tahsilat / Ödeme</h1>

      {err && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{err}</div>
      )}
      {success && (
        <div className="mb-3 p-2 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded p-4 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold">Cari</label>
            <select
              className="w-full border p-2 rounded"
              value={form.accountId}
  onChange={(e) => {
    const id = e.target.value;

    setForm((prev) => ({ ...prev, accountId: id }));

    // ✅ anında tetikle (useEffect beklemeden)
    if (token && id) {
      loadBalance(id);
      loadPayments(id);
    }
  }}
>
              <option value="">Cari Seç</option>

              {Array.isArray(cariList) &&
                cariList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.unvan || c.firmaAdi || c.ad || c.name || c.email || "-"}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Mevcut Bakiye</label>
            <div className="w-full border p-2 rounded bg-gray-50">
              {fmt(balance)} TRY
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Tarih</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Tutar</label>
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Tür</label>
            <select
              className="w-full border p-2 rounded"
              value={form.direction}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, direction: e.target.value }))
              }
            >
              <option value="alacak">Tahsilat</option>
              <option value="borc">Ödeme</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Yöntem</label>
            <select
              className="w-full border p-2 rounded"
              value={form.method}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, method: e.target.value }))
              }
            >
              <option value="cash">Nakit</option>
              <option value="bank">Banka</option>
              <option value="kart">Kart</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Not</label>
            <textarea
              className="w-full border p-2 rounded"
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>

{/* LİSTE */}
<div className="bg-white border rounded p-4">
  <h2 className="font-bold mb-3">Tahsilat / Ödeme Geçmişi</h2>

  {listLoading ? (
    <div>Yükleniyor...</div>
  ) : (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2 text-left">Tarih</th>
          <th className="border p-2 text-left">Tür</th>
          <th className="border p-2 text-left">Tutar</th>
          <th className="border p-2 text-left">Yöntem</th>
          <th className="border p-2 text-left">Not</th>
          <th className="border p-2 text-center">PDF</th>
          <th className="border p-2 text-center">İşlem</th>
        </tr>
      </thead>

      <tbody>
        {payments?.length === 0 ? (
          <tr>
            <td className="border p-2" colSpan={7}>
              Kayıt yok
            </td>
          </tr>
        ) : (
          payments.map((p) => {
            const isCancelled =
              p?.isDeleted === true || p?.status === "cancelled";

            return (
              <tr
                key={p._id}
                className={isCancelled ? "bg-gray-100 text-gray-400" : ""}
              >
                <td className="border p-2">
                  {p.date ? new Date(p.date).toLocaleDateString("tr-TR") : "-"}
                </td>

                <td className="border p-2">
                  {p.direction === "alacak" ? "Tahsilat" : "Ödeme"}

                  {/* ✅ İPTAL BADGE + TOOLTIP */}
                  {isCancelled && (
                    <span
                      title={`İptal Nedeni: ${p?.cancelReason || "-"}`}
                      className="ml-2 px-2 py-1 text-xs rounded bg-red-100 text-red-600 font-semibold"
                    >
                      İPTAL EDİLDİ
                    </span>
                  )}
                </td>

                <td className="border p-2">{fmt(p.amount)} TRY</td>

                <td className="border p-2">
                  {formatMethod(p.paymentMethod)}
                </td>

                <td className="border p-2">{p.note || "-"}</td>

                <td className="border p-2 text-center">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => openPdfForPayment(p._id)}
                  >
                    PDF
                  </button>
                </td>

                <td className="border p-2 text-center">
                  <button
                    disabled={isCancelled}
                    className={`underline ${
                      isCancelled
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-red-600"
                    }`}
                    onClick={() => cancelPayment(p._id)}
                  >
                    {isCancelled ? "Geri Alındı" : "Geri Al"}
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  )}
</div>
</div>
 );
 }
