// pages/auth/forgot-password.js

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setStatus({ type: "success", message: data.message });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Bir hata oluştu" });
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🔐 Şifremi Unuttum</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">E-posta:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", marginTop: "0.5rem" }}
        />
        <button type="submit" style={{ marginTop: "1rem" }}>
          Bağlantıyı Gönder
        </button>
      </form>

      {status && (
        <p style={{ marginTop: "1rem", color: status.type === "success" ? "green" : "red" }}>
          {status.message}
        </p>
      )}

      <p style={{ marginTop: "1rem" }}>
        <Link href="/auth/login" style={{ color: "blue", textDecoration: "underline" }}>
          ← Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
