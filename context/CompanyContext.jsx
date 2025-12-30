"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [companyId, setCompanyId] = useState(
    Cookies.get("activeCompanyId") || null
  );

  const changeCompany = (id) => {
    setCompanyId(id);
    Cookies.set("activeCompanyId", id);
  };

  return (
    <CompanyContext.Provider value={{ companyId, changeCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
