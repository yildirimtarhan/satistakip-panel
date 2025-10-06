import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", phone: "", password: "" });
  const [usePhone, setUsePhone] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = usePhone
      ? { phone: form.phone, password: form.password }
      : { email: form.email, password: form.password };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Giriş başarısız");
        return;
      }

      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Bir hata oluştu.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "400px", margin: "auto" }}>
      <h1>🔑 Giriş Yap</h1>
      <form onSubmit={handleSubmit}>
        {!usePhone ? (
          <div>
            <label>Email:</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
        ) : (
          <div>
            <label>Telefon:</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          <label>Şifre:</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>
          Giriş Yap
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => setUsePhone(!usePhone)}>
          {usePhone ? "📧 Email ile giriş yap" : "📱 Telefon ile giriş yap"}
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <a href="/auth/forgot-password" style={{ color: "blue" }}>
          ❓ Şifremi unuttum
        </a>
      </div>
    </div>
  );
}
