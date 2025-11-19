"use client";
import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    email: "",
    phone: "",
    password: "",
    password2: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.password2) {
      setError("Şifreler uyuşmuyor");
      return;
    }

    if (!form.email && !form.phone) {
      setError("Email veya telefon girmek zorunludur.");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kayıt başarısız");
        return;
      }

      setSuccess(
        "Kayıt başarılı! Hesabınız admin tarafından onaylandıktan sonra giriş yapabilirsiniz."
      );

      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setError("Sunucu hatası oluştu.");
    }
  };

  return (
    <div style={{ maxWidth: "450px", margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Yeni Üyelik</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        <div>
          <label>Ad:</label>
          <input
            type="text"
            name="ad"
            value={form.ad}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Soyad:</label>
          <input
            type="text"
            name="soyad"
            value={form.soyad}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Email (opsiyonel):</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Telefon (opsiyonel):</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="05xx xxx xx xx"
          />
        </div>

        <div>
          <label>Şifre:</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Şifre Tekrar:</label>
          <input
            type="password"
            name="password2"
            value={form.password2}
            onChange={handleChange}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "10px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Kayıt Ol
        </button>

        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {success && <p style={{ color: "green", textAlign: "center" }}>{success}</p>}
      </form>

      <p style={{ marginTop: "1rem", textAlign: "center", color: "#777" }}>
        Bu sistemde kayıt olduktan sonra hesabınız admin onayı sonrası aktif olur.
      </p>
    </div>
  );
}
