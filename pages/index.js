import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";


export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp > now) {
        router.push("/dashboard");
      } else {
        localStorage.removeItem("token");
        setCheckingAuth(false);
      }
    } catch (err) {
      console.error("JWT doğrulama hatası:", err);
      setCheckingAuth(false);
    }
  }, [router]);

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
        <meta name="description" content="Satışlarınızı kolayca takip edin" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
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
          </Link>{" "}
          sayfasını kullanın.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => router.push("/dashboard")}
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
            🏠 Panele Git
          </button>

          <button
            onClick={() => router.push("/dashboard/cari")}
            style={{
              margin: "0.5rem",
              backgroundColor: "#facc15",
              color: "#222",
              border: "1px solid #eab308",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            💰 Cari & Alış–Satış
          </button>
        </div>

        <footer style={{ marginTop: "3rem", color: "#666" }}>
          <p>© {new Date().getFullYear()} Satış Takip</p>
        </footer>
      </div>
    </>
  );
}
