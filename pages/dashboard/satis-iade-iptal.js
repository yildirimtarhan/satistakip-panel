import { useEffect, useState } from "react";

export default function SatisIadeIptal() {
  const [rows, setRows] = useState([]);
  const [type, setType] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);

    const qs = new URLSearchParams({
      type,
      ...(start && { start }),
      ...(end && { end }),
    });

    const token = localStorage.getItem("token");

    fetch(`/api/sales/refunds?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Yetkisiz");
        return r.json();
      })
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [type, start, end]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">İade / İptaller</h1>

      {/* 🔍 FİLTRE */}
      <div className="flex gap-3 mb-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-2"
        >
          <option value="all">Tümü</option>
          <option value="return">İadeler</option>
          <option value="cancel">İptaller</option>
        </select>

        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border p-2"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border p-2"
        />

        <button
          onClick={loadData}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Ara
        </button>
      </div>

      {/* 📊 TABLO */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Tarih</th>
            <th className="border p-2">Tür</th>
            <th className="border p-2">Belge</th>
            <th className="border p-2">Cari</th>
            <th className="border p-2 text-right">Tutar</th>
            <th className="border p-2">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td className="border p-2">
                {new Date(r.date).toLocaleDateString("tr-TR")}
              </td>
              <td className="border p-2">
                {r.type === "return" ? (
                  <span className="text-green-600 font-semibold">İADE</span>
                ) : (
                  <span className="text-red-600 font-semibold">İPTAL</span>
                )}
              </td>
              <td className="border p-2">{r.saleNo}</td>
              <td className="border p-2">{r.cari}</td>
              <td className="border p-2 text-right">
                {Number(r.total).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                ₺
              </td>
              <td className="border p-2 text-center">
                {r.type === "return" && (
                  <button
                    className="text-blue-600 underline"
                    onClick={() =>
                      window.open(
                        `/api/sales/return-pdf?returnSaleNo=${r.saleNo}`,
                        "_blank"
                      )
                    }
                  >
                    PDF
                  </button>
                )}
              </td>
            </tr>
          ))}

          {!rows.length && !loading && (
            <tr>
              <td colSpan={6} className="text-center p-4 text-gray-500">
                Kayıt bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
