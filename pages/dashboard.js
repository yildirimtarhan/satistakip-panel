import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jwtDecode from "jwt-decode";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/auth/login");
    } else {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (error) {
        console.error("Token çözümlenemedi:", error);
        router.push("/auth/login");
      }
    }
  }, []);

  const handleLogout = () => {
    router.push("/auth/logout");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 Satış Takip Paneli</h1>

      {user ? (
        <>
          <p>Hoş geldin, {user.email}</p>
          <button
            onClick={handleLogout}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#f44336",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Çıkış Yap
          </button>
        </>
      ) : (
        <p>Yükleniyor...</p>
      )}
    </div>
  );
}
