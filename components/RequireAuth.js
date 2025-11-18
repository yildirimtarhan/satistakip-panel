"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");

    if (!token) {
      router.replace("/auth/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.5rem",
        color: "#555"
      }}>
        🔐 Giriş doğrulanıyor...
      </div>
    );
  }

  return children;
}
