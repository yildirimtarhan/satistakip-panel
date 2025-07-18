// pages/auth/logout.js

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  }, []);

  return <p>Çıkış yapılıyor...</p>;
}
