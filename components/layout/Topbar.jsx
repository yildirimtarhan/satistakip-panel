// components/layout/Topbar.jsx
import { useRouter } from "next/router";

export default function Topbar() {
  const router = useRouter();

  return (
    <header className="h-14 border-b bg-white/70 backdrop-blur flex items-center justify-between px-4">
      <div className="font-semibold text-slate-800">
        {router.pathname.replace("/dashboard", "Dashboard") || "Dashboard"}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => document.documentElement.classList.toggle("dark")}
          className="px-3 py-1.5 rounded-lg border hover:bg-slate-50"
          title="Tema"
        >
          🌗
        </button>
        <button
          onClick={() => router.push("/logout")}
          className="px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
