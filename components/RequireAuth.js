"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function RequireAuth({ children }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token"); // ✔ Artık cookie’den okuyacak

    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    // Token varsa dashboard açılır
    setAllowed(true);
  }, []);

  if (!allowed) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 20,
          color: "#555",
        }}
      >
        🔐 Giriş doğrulanıyor...
      </div>
    );
  }

  return children;
}
