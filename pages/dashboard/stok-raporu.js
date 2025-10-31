import { useEffect, useState } from "react";

export default function StokRaporu() {
  const [urunler, setUrunler] = useState([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/urunler", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUrunler(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = urunler.filter(u =>
    u.ad.toLowerCase().includes(search.toLowerCase()) ||
    (u.barkod && u.barkod.includes(search)) ||
    (u.sku && u.sku.includes(search))
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4">📊 Stok Raporu</h1>

      <input
        className="border p-2 rounded w-64 mb-4"
        placeholder="Ürün adı / barkod / SKU ara..."
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
      />

      <table className="w-full text-sm bg-white rounded-xl shadow">
        <thead className="bg-orange-100 text-xs">
          <tr>
            <th>#</th>
            <th>Ürün</th>
            <th>Barkod</th>
            <th>SKU</th>
            <th>Toplam Stok</th>
            <th>Kritik</th>
            <th>Varyantlar</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((u,i)=>(
            <tr key={u._id} className="border-b hover:bg-slate-50">
              <td>{i+1}</td>

              <td className="flex items-center gap-2 p-2">
                {u.resimUrl && <img src={u.resimUrl} className="w-8 h-8 rounded"/>}
                {u.ad}
              </td>

              <td>{u.barkod}</td>
              <td>{u.sku}</td>

              <td className={`font-bold ${u.stokUyari && u.stok <= u.stokUyari ? "text-red-600" : ""}`}>
                {u.stok}
              </td>

              <td>
                {u.stokUyari > 0 && u.stok <= u.stokUyari ? "⚠️" : ""}
              </td>

              <td>
                {u.varyantlar?.length > 0 ? (
                  <div className="text-xs">
                    {u.varyantlar.map((v,idx)=>(
                      <div key={idx}>
                        ➜ {v.ad}: {v.stok} adet
                      </div>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
