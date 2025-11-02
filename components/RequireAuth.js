"use client";
import { useEffect } from "react";

export default function RequireAuth({ children }) {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/auth/login";
    }
  }, []);

  return children;
}
