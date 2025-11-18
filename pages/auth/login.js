"use client";
import { useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Giriş başarısız");
        return;
      }

      // 🔥 TOKEN COOKIE'YE YAZ — RequireAuth bunu okuyor
      Cookies.set("token", data.token, {
        expires: 7,
        secure: true,
        sameSite: "lax",
        path: "/",
      });

      // 🔥 GECİKME EKLE — Cookie tarayıcıda hazır olsun
      setTimeout(() => {
        router.push("/dashboard");
      }, 200);

    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Sunucu hatası");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Giriş Yap</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label>Şifre:</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>
          Giriş Yap
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <p style={{ marginTop: "1rem" }}>
        <Link href="/auth/forgot-password">Şifremi unuttum?</Link>
      </p>
    </div>
  );
}
