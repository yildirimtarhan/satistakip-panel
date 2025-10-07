// pages/auth/reset-password.js

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { email } = router.query; // URL'den e-postayı alıyoruz

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Şifreler eşleşmiyor" });
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStatus({ type: "success", message: data.message });

      // 2 saniye sonra login sayfasına yönlendir
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Bir hata oluştu" });
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🔑 Yeni Şifre Belirle</h1>
      {email ? (
        <>
          <p>
            <strong>{email}</strong> adresi için yeni şifre belirleyin.
          </p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label>Yeni Şifre:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ display: "block", marginTop: "0.5rem" }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label>Yeni Şifre (Tekrar):</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ display: "block", marginTop: "0.5rem" }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: "#000",
                color: "#fff",
                padding: "0.5rem 1rem",
                cursor: "pointer",
              }}
            >
              Şifreyi Güncelle
            </button>
          </form>
        </>
      ) : (
        <p style={{ color: "red" }}>Geçersiz bağlantı</p>
      )}

      {status && (
        <p
          style={{
            marginTop: "1rem",
            color: status.type === "success" ? "green" : "red",
          }}
        >
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
