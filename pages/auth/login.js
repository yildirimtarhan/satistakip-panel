"use client";
import { useState } from "react";
import { useRouter } from "next/router";
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
      const baseURL = process.env.NEXT_PUBLIC_SITE_URL || "";
      const res = await fetch(`${baseURL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Giriş başarısız");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Sunucuya ulaşılamadı.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Giriş Yap</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input type="email" name="email" value={form.email}
            onChange={handleChange} required />
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label>Şifre:</label>
          <input type="password" name="password" value={form.password}
            onChange={handleChange} required />
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
