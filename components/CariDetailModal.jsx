import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function CariDetailModal({ cari, onClose }) {
  const [summary, setSummary] = useState({ borc: 0, alacak: 0, bakiye: 0 });

  useEffect(() => {
    fetch(`/api/cari/balance?id=${cari._id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(setSummary);
  }, []);

  const sendWhatsApp = () => {
    const msg =
      `*Cari Bilgisi*\n` +
      `Ad: ${cari.ad}\n` +
      `Bakiye: ₺${summary.bakiye.toLocaleString("tr-TR")}\n`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const createPDF = () => {
    const doc = new jsPDF();
    doc.text(`Cari Detay - ${cari.ad}`, 14, 10);
    doc.autoTable({
      body: [
        ["Toplam Satış", `₺${summary.alacak}`],
        ["Toplam Alış", `₺${summary.borc}`],
        ["Bakiye", `₺${summary.bakiye}`],
      ],
    });
    doc.save(`Cari-${cari.ad}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-[420px] shadow-xl">
        <h2 className="text-xl font-bold mb-3">{cari.ad}</h2>

        <div className="text-sm space-y-1">
          <div><b>Telefon:</b> {cari.telefon || "-"}</div>
          <div><b>Vergi No:</b> {cari.vergiNo || "-"}</div>
          <div><b>Adres:</b> {cari.adres || "-"}</div>
        </div>

        <div className="border-t my-3 py-3">
          <div><b>Toplam Satış:</b> ₺{summary.alacak.toLocaleString("tr-TR")}</div>
          <div><b>Toplam Alış:</b> ₺{summary.borc.toLocaleString("tr-TR")}</div>
          <div className="font-bold text-orange-600 text-lg">
            Bakiye: ₺{summary.bakiye.toLocaleString("tr-TR")}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={createPDF} className="bg-gray-700 text-white px-3 py-1 rounded">📄 PDF</button>
          <button onClick={sendWhatsApp} className="bg-green-600 text-white px-3 py-1 rounded">🟢 WhatsApp</button>
          <button
            onClick={() => window.open("https://efatura-linkiniz.com", "_blank")}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            🧾 E-Fatura
          </button>
          <button onClick={onClose} className="ml-auto bg-gray-300 px-3 py-1 rounded">Kapat</button>
        </div>
      </div>
    </div>
  );
}
