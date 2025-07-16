// pages/n11.js
import { useEffect, useState } from "react";

export default function N11Page() {
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/n11");
        const data = await res.json();
        setResponse(data);
      } catch (err) {
        setResponse({ error: "İstek gönderilemedi." });
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>📦 N11 Paneli</h1>
      <pre>{JSON.stringify(response, null, 2)}</pre>
    </div>
  );
}
