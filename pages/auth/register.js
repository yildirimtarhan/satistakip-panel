// pages/auth/register.js

import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kayıt başarısız");
        return;
      }

      // Token'ı localStorage'a kaydet
      localStorage.setItem("token", data.token);

      // Başarılı kayıt sonrası yönlendir
      router.push("/dashboard");
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setError("Bir hata oluştu.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Kayıt Ol</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label>Şifre:</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button type="submit" style={{ marginTop: "1rem" }}>Kayıt Ol</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}
