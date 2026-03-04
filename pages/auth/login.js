"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ loginId: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Giriş başarısız");
        setLoading(false);
        return;
      }

      // 🔐 Token'ı COOKIE'ye yaz
      Cookies.set("token", data.token, {
        expires: 7,
         secure: false, // ✅ localhost için false yap
        sameSite: "lax",
        path: "/",
      });

      // 🔐 Aynı token'ı localStorage'a da yaz (RequireAuth için garanti)
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
      }

      setLoading(false);

      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Sunucu hatası");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center text-slate-800">
          🔐 Giriş Yap
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Cep telefonu veya E-posta</label>
            <input
              type="text"
              name="loginId"
              className="w-full border rounded-lg p-2"
              placeholder="05xx xxx xx xx veya e-posta adresiniz"
              value={form.loginId}
              onChange={handleChange}
              required
            />
          </div>

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

          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition"
            disabled={loading}
          >
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="flex justify-between text-sm mt-4">
          <Link href="/auth/forgot-password" className="text-blue-600">
            Şifremi Unuttum
          </Link>
          <Link href="/auth/register" className="text-blue-600">
            Yeni Hesap Oluştur
          </Link>
        </div>
      </div>
    </div>
  );
}