// 📄 Gelen fatura önizleme (popup)
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function GelenOnizleme() {
  const router = useRouter();
  const { id } = router.query;
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    fetch(`/api/efatura/incoming/preview?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.pdfUrl) setPdfUrl(data.pdfUrl);
        else if (data.pdfBase64) setPdfUrl(`data:application/pdf;base64,${data.pdfBase64}`);
        else setError("Bu fatura için PDF mevcut değil.");
      })
      .catch((e) => setError(e.message || "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!pdfUrl) return <div className="p-6 text-center text-slate-500">Önizleme yok</div>;

  return (
    <div className="h-screen flex flex-col">
      <iframe src={pdfUrl} className="flex-1 w-full border-0" title="Fatura önizleme" />
    </div>
  );
}
