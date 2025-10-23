// 📁 /pages/dashboard/cari.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import DashboardNavbar from "@/components/DashboardNavbar";

export default function CariPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
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

  // 🔐 Giriş kontrolü
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp > now) {
        setAuthorized(true);
      } else {
        localStorage.removeItem("token");
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("JWT kontrol hatası:", err);
      router.push("/auth/login");
    }
  }, [router]);

  // 🔹 Verileri çek
  useEffect(() => {
    if (!authorized) return;

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
  }, [authorized]);

  if (!authorized)
    return (
      <div className="text-center text-gray-600 mt-10 text-lg">
        🔐 Giriş kontrol ediliyor...
      </div>
    );

  // 💾 Form gönderimi
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
    <div>
      <DashboardNavbar />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
          💰 Cari ve Alış–Satış Takip Paneli
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

          {/* Kaydet */}
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
      </div>
    </div>
  );
}
