import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

export default function CariEkstresi() {
  const [cariler, setCariler] = useState([]);
  const [seciliCariId, setSeciliCariId] = useState("");
  const [seciliCari, setSeciliCari] = useState(null);
  const [items, setItems] = useState([]);

  const [dateFrom, setDateFrom] = useState(() =>
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [typeFilter, setTypeFilter] = useState("");

  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const logoInputRef = useRef(null);

  const tl = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

  const fetchCariler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCariler(Array.isArray(data) ? data : []);
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/cari/transactions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCariler();
    fetchTransactions();
  }, []);

  useEffect(() => {
    const c = cariler.find((x) => x._id === seciliCariId);
    setSeciliCari(c || null);
  }, [seciliCariId, cariler]);

  const filtered = useMemo(() => {
    const start = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T23:59:59");

    return items
      .filter((it) => {
        const okCari = seciliCari ? it.account === seciliCari.ad : true;
        const d = new Date(it.date || Date.now());
        const okDate = d >= start && d <= end;
        const okType = typeFilter
          ? String(it.type || it.tur).toLowerCase() ===
            typeFilter.toLowerCase()
          : true;

        return okCari && okDate && okType;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [items, seciliCari, dateFrom, dateTo, typeFilter]);

  const summary = useMemo(() => {
    let borc = 0,
      alacak = 0;

    filtered.forEach((t) => {
      const tur = (t.type || t.tur || "").toString();
      const tutarTRY = Number(t.totalTRY ?? t.total ?? 0);
      if (/purchase|Alış/i.test(tur)) borc += tutarTRY;
      else if (/sale|Satış/i.test(tur)) alacak += tutarTRY;
    });

    return { borc, alacak, bakiye: alacak - borc };
  }, [filtered]);

  // /// LOGO
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/logo.png");
        if (resp.ok) {
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onload = () => setLogoDataUrl(reader.result);
          reader.readAsDataURL(blob);
        }
      } catch {}
    })();
  }, []);

  const handleLogoPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.readAsDataURL(f);
  };

  // ✅ Excel Export (Filtreli)
  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      Tarih: toDateOnly(t.date || Date.now()),
      Cari: t.account,
      Ürün: t.product,
      Tür: t.type || t.tur,
      Miktar: t.quantity ?? "-",
      "Birim Fiyat": t.unitPrice ?? 0,
      PB: t.currency ?? "TRY",
      "Tutar (TL)": t.totalTRY ?? t.total ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");

    XLSX.writeFile(
      wb,
      `cari-ekstre_${seciliCari?.ad || "tum"}_${dateFrom}_${dateTo}.xlsx`
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 Cari Ekstresi
      </h1>

      {/* Filtre bar */}
      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-12 gap-3">
        <select
          className="border p-2 rounded col-span-12 md:col-span-4"
          value={seciliCariId}
          onChange={(e) => setSeciliCariId(e.target.value)}
        >
          <option value="">Cari Seç</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <select
          className="border p-2 rounded col-span-6 md:col-span-2"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tür</option>
          <option value="sale">Satış</option>
          <option value="purchase">Alış</option>
        </select>

        <div className="col-span-6 md:col-span-2 flex gap-2">
          <button
            className="flex-1 bg-orange-600 text-white rounded px-3"
            onClick={exportExcel}
          >
            📥 Excel
          </button>

          <button
            onClick={() => logoInputRef.current?.click()}
            className="border rounded px-3"
          >
            🖼️ Logo
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleLogoPick}
          />
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-12 gap-3">
        <SummaryCard title="Toplam Satış (TL)" value={tl(summary.alacak)} />
        <SummaryCard title="Toplam Alış (TL)" value={tl(summary.borc)} />
        <SummaryCard title="Bakiye (TL)" value={tl(summary.bakiye)} />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="p-2 text-left">Tarih</th>
              <th className="p-2 text-left">Ürün</th>
              <th className="p-2 text-left">Tür</th>
              <th className="p-2 text-right">Miktar</th>
              <th className="p-2 text-right">Birim Fiyat</th>
              <th className="p-2 text-center">PB</th>
              <th className="p-2 text-right">Tutar (TL)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="border-b hover:bg-slate-50">
                <td className="p-2">{toDateOnly(t.date || Date.now())}</td>
                <td className="p-2">{t.product || "-"}</td>
                <td className="p-2">{t.type || t.tur}</td>
                <td className="p-2 text-right">{t.quantity ?? "-"}</td>
                <td className="p-2 text-right">{tl(t.unitPrice ?? 0)}</td>
                <td className="p-2 text-center">{t.currency || "TRY"}</td>
                <td className="p-2 text-right">{tl(t.totalTRY ?? t.total ?? 0)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={7}>
                  Kayıt yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white rounded-xl shadow p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
