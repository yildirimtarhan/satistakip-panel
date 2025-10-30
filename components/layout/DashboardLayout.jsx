// components/layout/DashboardLayout.jsx
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen">
          <Topbar />
          <div className="p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
