// 📄 /pages/dashboard/efatura/yeni.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { E_FATURA_KDV_ORANLARI, DEFAULT_KDV_ORANI } from "@/lib/efatura/kdvOranlari";

export default function YeniFatura() {
  const router = useRouter();
  const { id } = router.query; // Düzenleme için taslak ID

  const [loading, setLoading] = useState(true);
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);

  // Fatura formu
  const [form, setForm] = useState({
    cariId: "",
    cariAd: "",
    tip: "SATIS", // SATIS / IADE
    kalemler: [],
    not: "",
    kdvOrani: DEFAULT_KDV_ORANI,
    genelToplam: 0,
  });

  // Yeni satır ekle
  const addRow = () => {
    setForm({
      ...form,
      kalemler: [
        ...form.kalemler,
        {
          urunId: "",
          urunAd: "",
          miktar: 1,
          birimFiyat: 0,
          kdv: 0,
          toplam: 0,
        },
      ],
    });
  };

  // Satır sil
  const removeRow = (i) => {
    const newRows = [...form.kalemler];
    newRows.splice(i, 1);
    setForm({ ...form, kalemler: newRows });
  };

  // Fatura toplamını güncelle
  const updateTotals = () => {
    let genel = 0;

    const updated = form.kalemler.map((k) => {
      const ara = Number(k.miktar) * Number(k.birimFiyat);
      const kdvTutar = (ara * Number(form.kdvOrani)) / 100;
      const toplam = ara + kdvTutar;

      genel += toplam;

      return { ...k, kdv: kdvTutar, toplam };
    });

    setForm((prev) => ({ ...prev, kalemler: updated, genelToplam: genel }));
  };

  // Cari & Ürün listelerini çek
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");

      const [cariRes, urunRes] = await Promise.all([
        fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setCariler(await cariRes.json());
      setUrunler(await urunRes.json());

      // Eğer düzenleme modundaysa mevcut fatura taslağını yükle
      if (id) {
        const draftRes = await fetch(`/api/efatura/drafts?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const draft = await draftRes.json();
        setForm(draft);
      }
    } catch (err) {
      console.error("Veriler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  // Kaydet
  const saveDraft = async () => {
    try {
      const token = localStorage.getItem("token");

      const method = id ? "PUT" : "POST";
      const url = id
        ? `/api/efatura/drafts?id=${id}`
        : "/api/efatura/drafts";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      alert("📝 Taslak kaydedildi!");
      router.push("/dashboard/efatura/taslaklar");
    } catch (err) {
      console.error(err);
      alert("❌ Kaydedilemedi.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    updateTotals();
  }, [form.kalemler, form.kdvOrani]);

  if (loading) return <div className="p-6">Yükleniyor...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        {id ? "✏️ Fatura Taslağını Düzenle" : "🧾 Yeni E-Fatura Oluştur"}
      </h1>

      {/* Cari Seçimi */}
      <div className="bg-white p-4 rounded-xl shadow space-y-3">
        <label className="font-semibold">Cari Seç *</label>
        <select
          className="input"
          value={form.cariId}
          onChange={(e) => {
            const cariId = e.target.value;
            const cari = cariler.find((c) => c._id === cariId);
            setForm({
              ...form,
              cariId,
              cariAd: cari?.ad || "",
            });
          }}
        >
          <option value="">Seçin...</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad}
            </option>
          ))}
        </select>
      </div>

      {/* Kalem Tablosu */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">Fatura Kalemleri</h2>

        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th>Ürün</th>
              <th>Miktar</th>
              <th>Birim Fiyat</th>
              <th>KDV</th>
              <th>Toplam</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {form.kalemler.map((k, i) => (
              <tr key={i} className="border-b">
                <td>
                  <select
                    className="input"
                    value={k.urunId}
                    onChange={(e) => {
                      const urun = urunler.find(
                        (u) => u._id === e.target.value
                      );
                      const newRows = [...form.kalemler];
                      newRows[i].urunId = urun._id;
                      newRows[i].urunAd = urun.ad;
                      newRows[i].birimFiyat = urun.satisFiyati || 0;
                      setForm({ ...form, kalemler: newRows });
                    }}
                  >
                    <option value="">Ürün seç...</option>
                    {urunler.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.ad}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    type="number"
                    className="input"
                    value={k.miktar}
                    onChange={(e) => {
                      const newRows = [...form.kalemler];
                      newRows[i].miktar = Number(e.target.value);
                      setForm({ ...form, kalemler: newRows });
                    }}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    className="input"
                    value={k.birimFiyat}
                    onChange={(e) => {
                      const newRows = [...form.kalemler];
                      newRows[i].birimFiyat = Number(e.target.value);
                      setForm({ ...form, kalemler: newRows });
                    }}
                  />
                </td>

                <td>%{form.kdvOrani}</td>

                <td>{k.toplam.toFixed(2)}₺</td>

                <td>
                  <button
                    className="text-red-600"
                    onClick={() => removeRow(i)}
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn-gray mt-3" onClick={addRow}>
          ➕ Kalem Ekle
        </button>
      </div>

      {/* KDV – Toplam (e-fatura oranları) */}
      <div className="bg-white p-4 rounded-xl shadow space-y-2">
        <label className="font-semibold">KDV Oranı</label>
        <select
          className="input w-40"
          value={E_FATURA_KDV_ORANLARI.includes(form.kdvOrani) ? form.kdvOrani : DEFAULT_KDV_ORANI}
          onChange={(e) => setForm({ ...form, kdvOrani: Number(e.target.value) })}
        >
          {E_FATURA_KDV_ORANLARI.map((oran) => (
            <option key={oran} value={oran}>%{oran}</option>
          ))}
        </select>

        <p className="text-right text-lg font-bold">
          Genel Toplam: {form.genelToplam.toFixed(2)}₺
        </p>
      </div>

      {/* Not */}
      <textarea
        className="input w-full"
        placeholder="Fatura notu (opsiyonel)"
        value={form.not}
        onChange={(e) => setForm({ ...form, not: e.target.value })}
      />

      {/* İşlem Butonları */}
      <div className="flex justify-end gap-2">
        <button className="btn-gray" onClick={() => router.back()}>
          İptal
        </button>

        <button className="btn-primary" onClick={saveDraft}>
          💾 Taslak Kaydet
        </button>

        <button
          className="btn-primary bg-green-600 hover:bg-green-700"
          onClick={() => router.push(`/dashboard/efatura/onizleme?id=${id}`)}
          disabled={!id}
        >
          📄 Önizleme
        </button>
      </div>
    </div>
  );
}
