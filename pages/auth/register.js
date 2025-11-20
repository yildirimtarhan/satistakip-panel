"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kayıt başarısız");
        setLoading(false);
        return;
      }

      setSuccess(
        "Kayıt başarılı! 🚀 Hesabınız admin tarafından onaylandıktan sonra giriş yapabilirsiniz."
      );
      setLoading(false);

      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);

    } catch (err) {
      console.error("Kayıt hatası:", err);
      setError("Beklenmedik bir hata oluştu.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center text-slate-800">
          📝 Yeni Hesap Oluştur
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* AD */}
          <div>
            <label className="block font-medium mb-1">Ad</label>
            <input
              type="text"
              name="ad"
              className="w-full border rounded-lg p-2"
              value={form.ad}
              onChange={handleChange}
              required
            />
          </div>

          {/* SOYAD */}
          <div>
            <label className="block font-medium mb-1">Soyad</label>
            <input
              type="text"
              name="soyad"
              className="w-full border rounded-lg p-2"
              value={form.soyad}
              onChange={handleChange}
              required
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block font-medium mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              className="w-full border rounded-lg p-2"
              placeholder="mail@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* TELEFON */}
          <div>
            <label className="block font-medium mb-1">Telefon</label>
            <input
              type="text"
              name="phone"
              className="w-full border rounded-lg p-2"
              placeholder="+90 5xx xxx xx xx"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          {/* ŞİFRE */}
          <div>
            <label className="block font-medium mb-1">Şifre</label>
            <input
              type="password"
              name="password"
              className="w-full border rounded-lg p-2"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition"
            disabled={loading}
          >
            {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Zaten hesabın var mı?{" "}
          <a href="/auth/login" className="text-blue-600">
            Giriş Yap
          </a>
        </p>
      </div>
    </div>
  );
}
