import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    };
    logout();
  }, [router]); // <- eksik dependency eklendi
}
