"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router"; // pages yapısı için doğru
import Cookies from "js-cookie";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");

    if (!token) {
      router.replace("/auth/login");
    } else {
      setChecked(true);
    }
  }, []);

  if (!checked) {
    return (
      <div style={styles.loading}>
        🔐 Oturum doğrulanıyor...
      </div>
    );
  }

  return children;
}

const styles = {
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "1.4rem",
    color: "#f97316",
    fontFamily: "sans-serif",
  },
};
