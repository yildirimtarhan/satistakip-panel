import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import AdminCompanySelector from "@/components/AdminCompanySelector";

export default function Topbar() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) return;

      const decoded = jwtDecode(token);
      setRole(decoded?.role || null);
    } catch {
      setRole(null);
    }
  }, []);

  const handleLogout = () => {
    router.push("/logout");
  };

  return (
    <header className="h-14 border-b bg-white/70 backdrop-blur flex items-center justify-between px-4">
      <div className="font-semibold text-slate-800">
        {router.pathname.replace("/dashboard", "Dashboard") || "Dashboard"}
      </div>

      <div className="flex items-center gap-3">
        {/* 🔥 SADECE ADMIN → FİRMA SEÇİCİ */}
        {role === "admin" && <AdminCompanySelector />}

        <button
          onClick={() => document.documentElement.classList.toggle("dark")}
          className="px-3 py-1.5 rounded-lg border hover:bg-slate-50"
          title="Tema"
        >
          🌗
        </button>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
