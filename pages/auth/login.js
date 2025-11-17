"use client";
import { useState } from "react";
import { useRouter } from "next/navigation"; // ✅ Düzeltilen satır
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

      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}

      if (!res.ok) {
        setError(data.message || "Giriş başarısız");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard"); // 🔥 Artık çalışacak
      }

    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Bir hata oluştu.");
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
            autoComplete="email"
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
            autoComplete="current-password"
          />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>
          Giriş Yap
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <p style={{ marginTop: "1rem" }}>
        <Link href="/auth/forgot-password" style={{ color: "blue", textDecoration: "underline" }}>
          Şifremi unuttum?
        </Link>
      </p>
    </div>
  );
}
