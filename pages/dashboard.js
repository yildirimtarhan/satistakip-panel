import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import { useEffect } from "react";

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      localStorage.removeItem("token");
      router.push("/auth/login");
    } catch (error) {
      console.error("Çıkış işlemi başarısız:", error);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Hoş geldiniz Dashboard</h1>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Çıkış Yap
      </button>
    </div>
  );
}

// JWT doğrulaması sunucu tarafında
export async function getServerSideProps(context) {
  const { req } = context;
  const token = req.cookies.token;

  if (!token) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return { props: {} };
  } catch (error) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }
}
