// 📁 /pages/index.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import Head from "next/head";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token");

    if (!token) {
      setChecking(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp > now) {
        router.replace("/dashboard"); // Token geçerli → Dashboard
      } else {
        Cookies.remove("token");
        setChecking(false);
      }
    } catch (err) {
      console.error("JWT doğrulama hatası:", err);
      Cookies.remove("token");
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div style={{
        display: "flex", justifyContent: "center",
        alignItems: "center", height: "100vh",
        fontSize: "1.4rem", color: "#555"
      }}>
        🔍 Oturum kontrol ediliyor...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Satış Takip Paneli</title>
      </Head>

      <div style={{
        fontFamily: "sans-serif",
        padding: "2rem",
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          📊 Satış Takip Paneline Hoş Geldiniz
        </h1>

        <p style={{ fontSize: "1.1rem", color: "#444" }}>
          Sisteme erişmek için{" "}
          <Link href="/auth/login">
            <strong style={{ color: "#ff6600", cursor: "pointer" }}>
              giriş yapın
            </strong>
          </Link>
        </p>

        <button
          onClick={() => router.push("/auth/login")}
          style={{
            marginTop: "2rem",
            backgroundColor: "#ff6600",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "1rem",
            cursor: "pointer"
          }}
        >
          🔐 Giriş Yap
        </button>
      </div>
    </>
  );
}
