// 📁 /components/RequireAuth.js
"use client";

import { useEffect, useState } from "react";

export default function RequireAuth({ children }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // 🔑 Token'ı sadece localStorage’dan kontrol ediyoruz
    const token = typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

    if (!token) {
      // Token yoksa login sayfasına at
      window.location.href = "/auth/login";
      return;
    }

    // Token varsa sayfayı göster
    setAllowed(true);
  }, []);

  if (!allowed) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  }

  return children;
}
