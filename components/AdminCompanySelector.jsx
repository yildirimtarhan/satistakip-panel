"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useCompany } from "@/context/CompanyContext";

export default function AdminCompanySelector() {
  const { companyId, changeCompany } = useCompany();
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);

  const token =
    Cookies.get("token") || localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    fetch("/api/admin/companies", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then(setCompanies);
  }, [token]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 border rounded-lg text-sm bg-white"
      >
        Firma Seç
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow z-50">
          {companies.map((c) => (
            <div
              key={c._id}
              onClick={() => {
                changeCompany(c._id);
                setOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                companyId === c._id ? "bg-orange-100" : ""
              }`}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
