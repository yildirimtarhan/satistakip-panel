"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import jsPDF from "jspdf";

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CariTahsilatPage() {
  const [token, setToken] = useState("");

  const [cariler, setCariler] = useState([]);
  const [balance, setBalance] = useState(0);
  const [payments, setPayments] = useState([]);

  const [form, setForm] = useState({
    accountId: "",
    date: todayISO(),
    amount: "",
    type: "tahsilat", // tahsilat | odeme
    method: "cash", // cash | bank | kart
    note: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const t = Cookies.get("token") || localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await fetch("/api/cari", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCariler(Array.isArray(data) ? data : data?.data || []);
      } catch {
        setCariler([]);
      }
    })();
  }, [token]);

  const loadBalance = async (accountId) => {
    if (!accountId || !token) {
      setBalance(0);
      return;
    }

    try {
      const res = await fetch(`/api/cari/balance?id=${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBalance(data?.bakiye ?? data?.balance ?? 0);
    } catch {
      setBalance(0);
    }
  };

  const loadPayments = async (accountId) => {
    if (!accountId || !token) {
      setPayments([]);
      return;
    }

    try {
      const res = await fetch(`/api/tahsilat/list?accountId=${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
    }
  };

  const save = async () => {
    if (!form.accountId) {
      setErr("Cari seçmelisin");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setErr("Tutar geçersiz");
      return;
    }

    setLoading(true);
    setErr("");
    setSuccess("");

    try {
      const payload = {
        accountId: form.accountId,
        date: form.date,
        amount: Number(form.amount),
        type: form.type,
        // backend uyumu: paymentMethod bekliyor
        paymentMethod: form.method,
        note: form.note,
        // ❌ direction göndermiyoruz (backend kendi standardını uyguluyor: borc/alacak)
      };

      const res = await fetch("/api/tahsilat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Kaydedilemedi");

      setSuccess("✅ İşlem başarıyla kaydedildi");

      await loadBalance(form.accountId);
      await loadPayments(form.accountId);

      setForm((f) => ({
        ...f,
        amount: "",
        note: "",
      }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = () => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(form.type === "tahsilat" ? "TAHSİLAT MAKBUZU" : "ÖDEME MAKBUZU", 105, 20, {
      align: "center",
    });

    const cari =
      cariler.find((c) => c._id === form.accountId) || {};

    doc.setFontSize(10);
    doc.text(`Tarih: ${form.date}`, 10, 40);
    doc.text(
      `Cari: ${cari.unvan || cari.firmaAdi || cari.ad || cari.name || cari.email || "-"}`,
      10,
      50
    );
    doc.text(`Tutar: ${fmt(form.amount)} TRY`, 10, 60);
    doc.text(`Yöntem: ${form.method}`, 10, 70);

    if (form.note) {
      doc.text(`Not: ${form.note}`, 10, 80);
    }

    doc.save(`${form.type}-${Date.now()}.pdf`);
  };

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold mb-4">Cari Tahsilat / Ödeme</h2>

      {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}
      {success && <div className="bg-green-100 text-green-700 p-2 mb-3">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          className="border p-2"
          value={form.accountId}
          onChange={(e) => {
            const id = e.target.value;
            setForm({ ...form, accountId: id });
            loadBalance(id);
            loadPayments(id);
          }}
        >
          <option value="">Cari Seç</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.unvan || c.firmaAdi || c.ad || c.email}
            </option>
          ))}
        </select>

        <div className="border p-2 bg-gray-50">
          <div className="text-xs text-gray-500">Mevcut Bakiye</div>
          <div className="font-semibold">{fmt(balance)} TRY</div>
        </div>

        <input
          type="date"
          className="border p-2"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />

        <input
          type="number"
          className="border p-2"
          placeholder="Tutar"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        <select
          className="border p-2"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="tahsilat">Tahsilat</option>
          <option value="odeme">Ödeme</option>
        </select>

        <select
          className="border p-2"
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
        >
          <option value="cash">Nakit</option>
          <option value="bank">Banka</option>
          <option value="kart">Kart</option>
        </select>

        <textarea
          className="border p-2 col-span-1 md:col-span-2"
          placeholder="Not"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>

          <button
            type="button"
            onClick={generatePdf}
            className="bg-gray-600 text-white px-4 py-2"
          >
            PDF
          </button>
        </div>
      </div>

      {/* ✅ Tahsilat/Ödeme Geçmişi */}
      {form.accountId && (
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Tahsilat / Ödeme Geçmişi</h3>

          {payments.length === 0 ? (
            <div className="text-sm text-gray-500">Kayıt bulunamadı.</div>
          ) : (
            <div className="overflow-auto border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Tarih</th>
                    <th className="border p-2 text-left">Tür</th>
                    <th className="border p-2 text-right">Tutar</th>
                    <th className="border p-2 text-left">Yöntem</th>
                    <th className="border p-2 text-left">Not</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td className="border p-2">
                        {p.date ? new Date(p.date).toLocaleDateString("tr-TR") : "-"}
                      </td>
                      <td className="border p-2">
                        {p.direction === "alacak" ? "Tahsilat" : "Ödeme"}
                      </td>
                      <td className="border p-2 text-right">{fmt(p.amount)} TRY</td>
                      <td className="border p-2">{p.paymentMethod || "-"}</td>
                      <td className="border p-2">{p.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
