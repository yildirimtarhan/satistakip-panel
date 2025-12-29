"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Tarih formatlayıcı
const fmtDate = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  return d.toLocaleString("tr-TR");
};

// Para formatı
const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
  });

export default function CariTahsilatPage() {
  const [token, setToken] = useState("");
  const [cariler, setCariler] = useState([]);
  const [list, setList] = useState([]);

  const [balance, setBalance] = useState(null);

  const [form, setForm] = useState({
    accountId: "",
    type: "tahsilat", // tahsilat | odeme
    paymentMethod: "nakit", // nakit | kart | banka
    amount: "",
    note: "",
  });

  const [filters, setFilters] = useState({
    accountId: "",
    type: "",
    paymentMethod: "",
    date: "",
    search: "",
  });

  const [loading, setLoading] = useState(false);

  // TOKEN
  useEffect(() => {
    const t = Cookies.get("token");
    if (t) {
      setToken(t);
    }
  }, []);

  // CARİLER
  const loadCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (Array.isArray(data)) setCariler(data);
  };

  // TAHSİLAT/ÖDEME LİSTE
  const loadList = async () => {
    const res = await fetch("/api/tahsilat", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (Array.isArray(data)) setList(data.reverse());
  };

  // CARİ BAKİYE
  // 🧮 CARİ BAKİYE YÜKLE
const loadBalance = async (id) => {
  if (!id || !token) {
    setBalance(0);
    return;
  }

  try {
    const res = await fetch(`/api/cari/balance?id=${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Bakiye alınamadı:", data);
      setBalance(0);
      return;
    }

    // API balance mı, bakiye mi dönüyor → ikisini de yakala
    const val =
      typeof data.balance === "number"
        ? data.balance
        : typeof data.bakiye === "number"
        ? data.bakiye
        : 0;

    setBalance(val);
  } catch (err) {
    console.error("Bakiye fetch hatası:", err);
    setBalance(0);
  }
};

  // TOKEN GELİNCE VERİLERİ ÇEK
  useEffect(() => {
    if (token) {
      loadCariler();
      loadList();
    }
  }, [token]);

  // FORM GÖNDER
  const handleSubmit = async () => {
  setLoading(true);

  // 🔁 type dönüşümü (ÇOK ÖNEMLİ)
  const payload = {
    ...form,
    type: form.type === "tahsilat" ? "collection" : "payment",
    amount: Number(form.amount),
  };

  try {
    const res = await fetch("/api/tahsilat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.message || "Hata oluştu");
      return;
    }

    alert("Başarıyla kaydedildi!");

    // 🔄 Form reset
    setForm({
      accountId: "",
      type: "tahsilat", // UI için aynı kalsın
      paymentMethod: "nakit",
      amount: "",
      note: "",
    });

    loadList();
    loadBalance(payload.accountId);
  } catch (err) {
    setLoading(false);
    alert("Sunucu hatası");
    console.error(err);
  }
};

  // PDF MAKBUZ
  const generatePdf = (t) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    doc.setFontSize(16);
    doc.text(
      t.type === "tahsilat"
        ? "TAHSİLAT MAKBUZU"
        : "ÖDEME MAKBUZU",
      105,
      20,
      { align: "center" }
    );

    const cari = cariler.find((c) => c._id === t.accountId);

    doc.setFontSize(11);
    doc.text(`Cari: ${cari?.ad || "-"}`, 20, 40);
    doc.text(`Tutar: ₺${fmt(t.amount)}`, 20, 47);
    doc.text(`Tür: ${t.type === "tahsilat" ? "Tahsilat" : "Ödeme"}`, 20, 54);
    doc.text(
      `Ödeme Yöntemi: ${
        t.paymentMethod === "nakit"
          ? "Nakit"
          : t.paymentMethod === "kart"
          ? "Kredi Kartı"
          : "Banka Havale"
      }`,
      20,
      61
    );
    doc.text(`Tarih: ${fmtDate(t.date)}`, 20, 68);

    doc.setFontSize(10);
    doc.text("Açıklama:", 20, 80);
    doc.text(t.note || "-", 20, 86, { maxWidth: 170 });

    doc.setFontSize(10);
    doc.text("SatışTakip ERP tarafından otomatik oluşturulmuştur.", 105, 285, {
      align: "center",
    });

    doc.save(`makbuz-${t._id}.pdf`);
  };

  // FİLTRELENMİŞ LİSTE
  const filtered = list.filter((t) => {
    if (filters.accountId && t.accountId !== filters.accountId) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (
      filters.paymentMethod &&
      t.paymentMethod !== filters.paymentMethod
    )
      return false;
    if (filters.search) {
      if (
        !t.note?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !String(t.amount).includes(filters.search)
      )
        return false;
    }
    return true;
  });

  const cariSecildi = form.accountId;

  return (
    <div className="p-6 space-y-8">

      {/* BAŞLIK */}
      <h1 className="text-2xl font-bold text-orange-600">
        💰 Cari Tahsilat & Ödeme
      </h1>

      {/* CARİ BAKİYE KARTI */}
      {cariSecildi && (
        <div className="p-4 bg-white rounded-xl shadow border w-fit">
          <div className="text-sm text-gray-500">Cari Bakiye</div>
          <div
            className={`text-xl font-semibold ${
              balance > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            ₺{fmt(balance)}
          </div>
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-12 gap-4 bg-white p-5 rounded-xl shadow"
      >
        <select
          className="border rounded p-2 col-span-4"
          value={form.accountId}
          onChange={(e) => {
            setForm({ ...form, accountId: e.target.value });
            loadBalance(e.target.value);
          }}
        >
          <option value="">Cari Seç *</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2 col-span-3"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value })
          }
        >
          <option value="tahsilat">Tahsilat</option>
          <option value="odeme">Ödeme</option>
        </select>

        <select
          className="border rounded p-2 col-span-3"
          value={form.paymentMethod}
          onChange={(e) =>
            setForm({ ...form, paymentMethod: e.target.value })
          }
        >
          <option value="nakit">Nakit</option>
          <option value="kart">Kredi Kartı</option>
          <option value="banka">Banka Havale</option>
        </select>

        <input
          type="number"
          className="border rounded p-2 col-span-3"
          placeholder="Tutar *"
          value={form.amount}
          onChange={(e) =>
            setForm({ ...form, amount: e.target.value })
          }
        />

        <input
          className="border rounded p-2 col-span-5"
          placeholder="Not (opsiyonel)"
          value={form.note}
          onChange={(e) =>
            setForm({ ...form, note: e.target.value })
          }
        />

        <button
          disabled={loading}
          className="bg-orange-600 text-white rounded col-span-12 py-2 hover:bg-orange-700"
        >
          {loading ? "Kaydediliyor..." : "Kaydet ✔"}
        </button>
      </form>

      {/* FİLTRELER */}
      <div className="grid grid-cols-12 gap-4 bg-white p-4 rounded shadow">
        <select
          className="border rounded p-2 col-span-3"
          value={filters.accountId}
          onChange={(e) =>
            setFilters({ ...filters, accountId: e.target.value })
          }
        >
          <option value="">Cari Filtre</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2 col-span-2"
          value={filters.type}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value })
          }
        >
          <option value="">Tür</option>
          <option value="tahsilat">Tahsilat</option>
          <option value="odeme">Ödeme</option>
        </select>

        <select
          className="border rounded p-2 col-span-2"
          value={filters.paymentMethod}
          onChange={(e) =>
            setFilters({
              ...filters,
              paymentMethod: e.target.value,
            })
          }
        >
          <option value="">Ödeme Yöntemi</option>
          <option value="nakit">Nakit</option>
          <option value="kart">Kart</option>
          <option value="banka">Banka</option>
        </select>

        <input
          className="border rounded p-2 col-span-3"
          placeholder="Açıklama / Tutar ara..."
          value={filters.search}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value })
          }
        />
      </div>

      {/* TABLO */}
      <table className="w-full text-sm bg-white rounded-xl shadow overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Cari</th>
            <th className="p-2">Tür</th>
            <th className="p-2">Yöntem</th>
            <th className="p-2">Tutar</th>
            <th className="p-2">Açıklama</th>
            <th className="p-2">Tarih</th>
            <th className="p-2 text-center">Makbuz</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((t, i) => {
            const cari = cariler.find((c) => c._id === t.accountId);

            return (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-2">{cari?.ad || "-"}</td>

                <td
                  className={`p-2 font-bold ${
                    t.type === "tahsilat"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {t.type === "tahsilat"
                    ? "Tahsilat"
                    : "Ödeme"}
                </td>

                <td className="p-2 capitalize">
                  {t.paymentMethod === "nakit"
                    ? "Nakit"
                    : t.paymentMethod === "kart"
                    ? "Kart"
                    : "Banka"}
                </td>

                <td className="p-2">₺{fmt(t.amount)}</td>

                <td className="p-2">{t.note || "-"}</td>

                <td className="p-2">{fmtDate(t.date)}</td>

                <td className="p-2 text-center">
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                    onClick={() => generatePdf(t)}
                  >
                    PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
