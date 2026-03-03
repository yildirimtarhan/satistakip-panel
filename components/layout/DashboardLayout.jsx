// components/layout/DashboardLayout.jsx
"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 min-h-screen min-w-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <div className="p-4 md:p-5 pb-20 md:pb-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
