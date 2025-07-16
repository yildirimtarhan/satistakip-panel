// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get("content-type");
      let data = {};

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("Geçersiz sunucu yanıtı");
      }

      if (res.ok) {
        Cookies.set("token", data.token); // ← JWT TOKEN BURADA SET EDİLİYOR
        console.log("Giriş başarılı, yönlendiriliyor...");
        router.push("/panel");
      } else {
        setError(data.message || "Giriş başarısız.");
      }
    } catch (err) {
      setError("Bir hata oluştu: " + err.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Giriş Sayfası</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="E-posta" required /><br /><br />
        <input type="password" name="password" placeholder="Şifre" required /><br /><br />
        <button type="submit">Giriş Yap</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
