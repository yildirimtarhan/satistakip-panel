"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export const runtime = "nodejs"; 

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    Cookies.remove("token", { path: "/" });
    router.push("/auth/login");
  }, [router]);

  return null;
}
