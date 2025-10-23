import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function CariPage() {
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({
    accountId: "",
    productId: "",
    type: "sale",
    quantity: 1,
    unitPrice: "",
    currency: "TRY",
  });
  const [message, setMessage] = useState("");

  // 🔹 Sayfa açıldığında verileri çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, prodRes, tranRes] = await Promise.all([
          fetch("/api/cari/accounts"),
          fetch("/api/cari/products"),
          fetch("/api/cari/transactions"),
        ]);
        setAccounts(await accRes.json());
        setProducts(await prodRes.json());
        setTransactions(await tranRes.json());
      } catch (err) {
        console.error("❌ Veri yüklenemedi:", err);
      }
    };
    fetchData();
  }, []);

  // 🔹 Form gönderimi
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/cari/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("✅ İşlem başarıyla eklendi!");
      setForm({ ...form, quantity: 1, unitPrice: "" });

      const tranRes = await fetch("/api/cari/transactions");
      setTransactions(await tranRes.json());
    } else {
      setMessage(`❌ Hata: ${data.message}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        📊 Cari ve Alış–Satış Takip Paneli
      </h1>

      {/* 📊 Cari Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 shadow rounded-lg text-center">
          <p className="text-sm text-gray-500">Toplam Alacak (Müşteriler)</p>
          <h3 className="text-xl font-bold text-green-600">
            ₺{" "}
            {accounts
              .filter((a) => a.type === "customer" && a.balance > 0)
              .reduce((sum, a) => sum + a.balance, 0)
              .toLocaleString("tr-TR")}
          </h3>
        </div>

        <div className="bg-white p-4 shadow rounded-lg text-center">
          <p className="text-sm text-gray-500">Toplam Borç (Tedarikçiler)</p>
          <h3 className="text-xl font-bold text-red-600">
            ₺{" "}
            {accounts
              .filter((a) => a.type === "supplier" && a.balance < 0)
              .reduce((sum, a) => sum + Math.abs(a.balance), 0)
              .toLocaleString("tr-TR")}
          </h3>
        </div>

        <div className="bg-white p-4 shadow rounded-lg text-center">
          <p className="text-sm text-gray-500">Toplam Stok</p>
          <h3 className="text-xl font-bold text-blue-600">
            {products.reduce((sum, p) => sum + p.stock, 0)} Adet
          </h3>
        </div>

        <div className="bg-white p-4 shadow rounded-lg text-center">
          <p className="text-sm text-gray-500">Döviz Toplamı</p>
          <h3 className="text-md font-semibold">
            💵 USD:{" "}
            {products
              .filter((p) => p.currency === "USD")
              .reduce((sum, p) => sum + p.sellPrice * p.stock, 0)
              .toLocaleString("en-US")}{" "}
            <br />
            💶 EUR:{" "}
            {products
              .filter((p) => p.currency === "EUR")
              .reduce((sum, p) => sum + p.sellPrice * p.stock, 0)
              .toLocaleString("en-US")}
          </h3>
        </div>
      </div>

      {/* 📈 Haftalık Alış / Satış Grafiği */}
      <div className="bg-white p-4 mb-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">📆 Haftalık Alış / Satış Grafiği</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={(() => {
              const today = new Date();
              const last7days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() - (6 - i));
                const dayStr = d.toLocaleDateString("tr-TR", {
                  day: "2-digit",
                  month: "2-digit",
                });

                const dailySales = transactions
                  .filter(
                    (t) =>
                      t.type === "sale" &&
                      new Date(t.date).toLocaleDateString("tr-TR") ===
                        d.toLocaleDateString("tr-TR")
                  )
                  .reduce((sum, t) => sum + t.total, 0);

                const dailyPurchases = transactions
                  .filter(
                    (t) =>
                      t.type === "purchase" &&
                      new Date(t.date).toLocaleDateString("tr-TR") ===
                        d.toLocaleDateString("tr-TR")
                  )
                  .reduce((sum, t) => sum + t.total, 0);

                return {
                  date: dayStr,
                  Satış: dailySales,
                  Alış: dailyPurchases,
                };
              });
              return last7days;
            })()}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Satış" stroke="#22c55e" strokeWidth={3} />
            <Line type="monotone" dataKey="Alış" stroke="#ef4444" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 💾 İşlem Formu */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 bg-gray-100 p-4 rounded-lg shadow"
      >
        {/* Cari Hesap */}
        <div>
          <label className="block text-sm font-semibold mb-1">Cari Hesap</label>
          <select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">Seçiniz</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} ({a.type === "customer" ? "Müşteri" : "Tedarikçi"})
              </option>
            ))}
          </select>
        </div>

        {/* Ürün */}
        <div>
          <label className="block text-sm font-semibold mb-1">Ürün</label>
          <select
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">Seçiniz</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.currency})
              </option>
            ))}
          </select>
        </div>

        {/* İşlem Tipi */}
        <div>
          <label className="block text-sm font-semibold mb-1">İşlem Tipi</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="sale">Satış</option>
            <option value="purchase">Alış</option>
          </select>
        </div>

        {/* Miktar */}
        <div>
          <label className="block text-sm font-semibold mb-1">Miktar</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="w-full border rounded px-2 py-1"
            min="1"
          />
        </div>

        {/* Fiyat */}
        <div>
          <label className="block text-sm font-semibold mb-1">Birim Fiyat</label>
          <input
            type="number"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            className="w-full border rounded px-2 py-1"
            step="0.01"
          />
        </div>

        {/* Döviz */}
        <div>
          <label className="block text-sm font-semibold mb-1">Para Birimi</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="TRY">₺ TL</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>

        {/* Kaydet Butonu */}
        <div className="col-span-2 md:col-span-3 text-right">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Kaydet
          </button>
        </div>
      </form>

      {message && (
        <div className="mb-4 text-center font-semibold text-green-600">
          {message}
        </div>
      )}

      {/* 🧾 Geçmiş İşlemler */}
      <h2 className="text-xl font-semibold mb-2">📋 Son İşlemler</h2>
      <table className="w-full border text-sm bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Tarih</th>
            <th className="p-2 border">Cari</th>
            <th className="p-2 border">Ürün</th>
            <th className="p-2 border">Tip</th>
            <th className="p-2 border">Miktar</th>
            <th className="p-2 border">Toplam</th>
            <th className="p-2 border">Para Birimi</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t._id}>
              <td className="p-2 border">
                {new Date(t.date).toLocaleString()}
              </td>
              <td className="p-2 border">{t.accountId}</td>
              <td className="p-2 border">{t.productId}</td>
              <td className="p-2 border">
                {t.type === "sale" ? "Satış" : "Alış"}
              </td>
              <td className="p-2 border">{t.quantity}</td>
              <td className="p-2 border">{t.total}</td>
              <td className="p-2 border">{t.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
