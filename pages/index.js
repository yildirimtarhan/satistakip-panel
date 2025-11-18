"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ← yeni router
import Head from "next/head";
import Link from "next/link";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token"); // ← Artık Cookies kullanıyoruz

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp > now) {
        // 🔐 Token geçerli → Dashboard’a yönlendir
        router.push("/dashboard");
      } else {
        Cookies.remove("token");
        setCheckingAuth(false);
      }
    } catch (err) {
      console.error("JWT doğrulama hatası:", err);
      Cookies.remove("token");
      setCheckingAuth(false);
    }
  }, []);

  if (checkingAuth) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.5rem",
          color: "#555",
        }}
      >
        🔍 Oturum kontrol ediliyor...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Satış Takip Paneli</title>
      </Head>

      <div
        style={{
          fontFamily: "sans-serif",
          padding: "2rem",
          textAlign: "center",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          📊 Satış Takip Paneline Hoş Geldiniz
        </h1>

        <p style={{ fontSize: "1.1rem", color: "#444" }}>
          Sisteme giriş yapmak için{" "}
          <Link href="/auth/login">
            <strong style={{ color: "#0070f3", cursor: "pointer" }}>
              Giriş Yap
            </strong>
          </Link>
        </p>

        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => router.push("/auth/login")}
            style={{
              margin: "0.5rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            🔐 Giriş Yap
          </button>
        </div>
      </div>
    </>
  );
}
