"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token");  // ⬅ Artık Cookie kontrol ediyor
    if (token) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div style={{ display:"flex",justifyContent:"center",alignItems:"center",height:"100vh" }}>
        ⏳ Oturum kontrol ediliyor...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign:"center" }}>
      <h1>📊 Satış Takip Sistemine Hoş Geldiniz</h1>
      <p>
        Sisteme giriş için{" "}
        <Link href="/auth/login" style={{ color:"blue" }}>
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}
