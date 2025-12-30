"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import jsPDF from "jspdf";

// Tarih formatı
const fmtDate = (val) => {
  if (!val) return "-";
  return new Date(val).toLocaleString("tr-TR");
};

// Para formatı
const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CariTahsilatPage() {
  const [token, setToken] = useState("");
  const [cariler, setCariler] = useState([]);
  const [list, setList] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    accountId: "",
    type: "tahsilat", // tahsilat | odeme
    paymentMethod: "nakit",
    amount: "",
    note: "",
  });

  const [filters, setFilters] = useState({
    accountId: "",
    type: "",
    paymentMethod: "",
    search: "",
  });

  // TOKEN
  useEffect(() => {
    const t = Cookies.get("token");
    if (t) setToken(t);
  }, []);

  // CARİLER
  const loadCariler = async () => {
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setCariler(data);
  };

  // TAHSİLAT / ÖDEME LİSTESİ
  const loadList = async () => {
    const res = await fetch("/api/tahsilat", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setList(data.reverse());
  };

  // 🧮 CARİ BAKİYE
  const loadBalance = async (id) => {
    if (!id) {
      setBalance(0);
      return;
    }

    const res = await fetch(`/api/cari/balance?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setBalance(data?.balance ?? data?.bakiye ?? 0);
  };

  // TOKEN GELİNCE YÜKLE
  useEffect(() => {
    if (token) {
      loadCariler();
      loadList();
    }
  }, [token]);

  // 💾 KAYDET
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      accountId: form.accountId,
      type: form.type, // 🔴 backend ile birebir
      paymentMethod: form.paymentMethod,
      amount: Number(form.amount),
      note: form.note,
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

      alert("✔ İşlem kaydedildi");

      setForm({
        accountId: "",
        type: "tahsilat",
        paymentMethod: "nakit",
        amount: "",
        note: "",
      });

      loadList();
      loadBalance(payload.accountId);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Sunucu hatası");
    }
  };

  // 🧾 MAKBUZ PDF
  const generatePdf = (t) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(
      t.type === "tahsilat" ? "TAHSİLAT MAKBUZU" : "ÖDEME MAKBUZU",
      105,
      20,
      { align: "center" }
    );

    const cari = cariler.find((c) => c._id === t.accountId);

    doc.setFontSize(11);
    doc.text(`Cari: ${cari?.ad || "-"}`, 20, 40);
    doc.text(`Tutar: ₺${fmt(t.amount)}`, 20, 48);
    doc.text(`Yöntem: ${t.paymentMethod}`, 20, 56);
    doc.text(`Tarih: ${fmtDate(t.date)}`, 20, 64);
    doc.text(`Not: ${t.note || "-"}`, 20, 72);

    doc.save(`makbuz-${t._id}.pdf`);
  };

  // 🔍 FİLTRE
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">
        💰 Cari Tahsilat & Ödeme
      </h1>

      {/* BAKİYE */}
      {form.accountId && (
        <div className="bg-white p-4 rounded shadow w-fit">
          <div className="text-sm text-gray-500">Cari Bakiye</div>
          <div
            className={`text-xl font-bold ${
              balance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            ₺{fmt(balance)}
          </div>
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-12 gap-4 bg-white p-4 rounded shadow"
      >
        <select
          className="col-span-4 border p-2 rounded"
          value={form.accountId}
          onChange={(e) => {
            setForm({ ...form, accountId: e.target.value });
            loadBalance(e.target.value);
          }}
          required
        >
          <option value="">Cari seç</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <select
          className="col-span-2 border p-2 rounded"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="tahsilat">Tahsilat</option>
          <option value="odeme">Ödeme</option>
        </select>

        <select
          className="col-span-2 border p-2 rounded"
          value={form.paymentMethod}
          onChange={(e) =>
            setForm({ ...form, paymentMethod: e.target.value })
          }
        >
          <option value="nakit">Nakit</option>
          <option value="kart">Kart</option>
          <option value="banka">Banka</option>
        </select>

        <input
          type="number"
          className="col-span-2 border p-2 rounded"
          placeholder="Tutar"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />

        <input
          className="col-span-6 border p-2 rounded"
          placeholder="Not"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        <button
          disabled={loading}
          className="col-span-12 bg-orange-600 text-white py-2 rounded"
        >
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>

      {/* TABLO */}
      <table className="w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Cari</th>
            <th className="p-2">Tür</th>
            <th className="p-2">Yöntem</th>
            <th className="p-2">Tutar</th>
            <th className="p-2">Not</th>
            <th className="p-2">Tarih</th>
            <th className="p-2">PDF</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => {
            const cari = cariler.find((c) => c._id === t.accountId);
            return (
              <tr key={t._id} className="border-t">
                <td className="p-2">{cari?.ad || "-"}</td>
                <td className="p-2">{t.type}</td>
                <td className="p-2">{t.paymentMethod}</td>
                <td className="p-2">₺{fmt(t.amount)}</td>
                <td className="p-2">{t.note || "-"}</td>
                <td className="p-2">{fmtDate(t.date)}</td>
                <td className="p-2">
                  <button
                    onClick={() => generatePdf(t)}
                    className="text-blue-600"
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
