import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Menu } from "lucide-react";
import AdminCompanySelector from "@/components/AdminCompanySelector";

export default function Topbar({ onMenuClick }) {
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
    <header className="h-14 border-b bg-white/70 backdrop-blur flex items-center justify-between px-3 md:px-4 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2.5 -ml-1 rounded-lg hover:bg-slate-100 touch-manipulation"
            aria-label="Menüyü aç"
          >
            <Menu size={24} className="text-slate-700" />
          </button>
        )}
        <span className="font-semibold text-slate-800 truncate text-sm md:text-base">
          {router.pathname.replace("/dashboard", "Dashboard") || "Dashboard"}
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* 🔥 SADECE ADMIN → FİRMA SEÇİCİ */}
        {role === "admin" && <AdminCompanySelector />}

        <button
          onClick={() => document.documentElement.classList.toggle("dark")}
          className="p-2.5 md:px-3 md:py-1.5 rounded-lg border hover:bg-slate-50 touch-manipulation"
          title="Tema"
        >
          🌗
        </button>

        <button
          onClick={handleLogout}
          className="px-2.5 py-2 md:px-3 md:py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 text-sm font-medium touch-manipulation"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
