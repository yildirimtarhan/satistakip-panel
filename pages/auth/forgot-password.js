import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Şimdilik dummy cevap veriyoruz
    // Burada normalde: fetch("/api/auth/forgot-password") çağrısı olurdu.
    setTimeout(() => {
      setStatus({
        type: "success",
        message: "Eğer e-posta adresiniz kayıtlıysa şifre sıfırlama bağlantısı gönderildi ✅",
      });
    }, 1000);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Şifremi Unuttum</h1>
      <p style={{ marginBottom: "1rem" }}>
        E-posta adresinizi girin, şifre sıfırlama bağlantısı e-posta ile gönderilecektir.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
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
        </div>

        <button
          type="submit"
          style={{
            marginTop: "1rem",
            background: "#000",
            color: "#fff",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          Sıfırlama Bağlantısı Gönder
        </button>
      </form>

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
