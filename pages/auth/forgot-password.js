// pages/auth/forgot-password.js

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Lütfen e-posta adresinizi girin.");
      return;
    }

    try {
      // Burada ileride gerçek API çağrısı yapılacak.
      console.log("Şifre sıfırlama isteği gönderildi:", email);
      setSent(true);
    } catch (err) {
      console.error("Hata:", err);
      setError("Bir hata oluştu, lütfen tekrar deneyin.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "400px", margin: "auto" }}>
      <h1>🔐 Şifremi Unuttum</h1>

      {!sent ? (
        <form onSubmit={handleSubmit}>
          <div>
            <label>E-posta Adresi:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              required
              style={{ width: "100%", marginTop: "0.5rem" }}
            />
          </div>

          <button type="submit" style={{ marginTop: "1rem" }}>
            Şifre Sıfırlama Bağlantısı Gönder
          </button>

          {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
        </form>
      ) : (
        <p style={{ color: "green" }}>
          📩 Şifre sıfırlama bağlantısı e-posta adresinize gönderildi (dummy).
        </p>
      )}
    </div>
  );
}
