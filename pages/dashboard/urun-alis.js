"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { jsPDF } from "jspdf";

export default function UrunAlis() {
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [cariId, setCariId] = useState("");
  const [rates, setRates] = useState({ TRY: 1, USD: 0, EUR: 0 });
  const [manualRates, setManualRates] = useState({ USD: "", EUR: "" });
  const [loadingRates, setLoadingRates] = useState(false);
  const [token, setToken] = useState("");

  // Üst bilgi (belge başlığı)
  const [header, setHeader] = useState({
    tarih: "",
    belgeNo: "",
    siparisNo: "",
    aciklama: "",
  });

  const emptyRow = {
    barkod: "",
    productId: "",
    ad: "",
    adet: 1,
    fiyat: 0,
    kdv: 20,
    currency: "TRY",
  };

  const [rows, setRows] = useState([emptyRow]);

  // 🔐 Token
  useEffect(() => {
    const t =
      Cookies.get("token") || localStorage.getItem("token") || "";
    if (t) setToken(t);
  }, []);

  // 📥 Cari + Ürünler (YENİ: /api/products/list kullanıyoruz)
  useEffect(() => {
    if (!token) return;

    // Cariler
    fetch("/api/cari", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setCariler(Array.isArray(d) ? d : []))
      .catch((e) => console.error("Cari listesi hatası:", e));

    // Ürünler (Yeni Product modeli)
    fetch("/api/products/list", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setUrunler(Array.isArray(d) ? d : []))
      .catch((e) => console.error("Ürün listesi hatası:", e));
  }, [token]);

  // 💱 Kur çek (TCMB)
  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const r = await fetch("/api/rates/tcmb");
      const data = await r.json();
      if (r.ok && data?.rates) {
        setRates(data.rates);
      } else {
        alert("Kur alınamadı");
      }
    } catch (err) {
      console.error("Kur hatası:", err);
    }
    setLoadingRates(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const effectiveRate = (cur) => {
    if (cur === "USD") return Number(manualRates.USD) || rates.USD || 0;
    if (cur === "EUR") return Number(manualRates.EUR) || rates.EUR || 0;
    return 1;
  };

  // 🔍 Barkoddan ürün bul (barcode + barkod destekli)
  const handleBarkod = (i, val) => {
    const copy = [...rows];
    copy[i].barkod = val;

    const urun = Array.isArray(urunler)
      ? urunler.find((u) => {
          const b =
            (u.barcode || u.barkod || "").toString().trim();
          return b === val.toString().trim();
        })
      : null;

    if (urun) {
      copy[i].productId = urun._id;
      copy[i].ad = urun.name || urun.ad || "";
      // Fiyat & KDV eşleştirme (yeni + eski alanlar)
      copy[i].fiyat =
        urun.priceTl ??
        urun.alisFiyati ??
        0;
      copy[i].kdv =
        urun.vatRate ??
        urun.kdvOrani ??
        20;
      copy[i].currency = "TRY"; // Product model TL bazlı, alış satırında PB yönetiyoruz
    }

    setRows(copy);
  };

  // 🔍 Ürün adından bul (name + ad)
  const handleUrunAd = (i, val) => {
    const copy = [...rows];
    copy[i].ad = val;

    const urun = Array.isArray(urunler)
      ? urunler.find(
          (x) =>
            x.name === val ||
            x.ad === val
        )
      : null;

    if (urun) {
      copy[i].productId = urun._id;
      copy[i].barkod = urun.barcode || urun.barkod || "";
      copy[i].fiyat =
        urun.priceTl ??
        urun.alisFiyati ??
        0;
      copy[i].kdv =
        urun.vatRate ??
        urun.kdvOrani ??
        20;
      copy[i].currency = "TRY";
    }

    setRows(copy);
  };

  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i][field] = value;
    setRows(copy);
  };

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (i) =>
    setRows(rows.filter((_, idx) => idx !== i));

  // 🧮 Satırın TL karşılığı (KDV dahil)
  const rowTL = (r) => {
    const fx = effectiveRate(r.currency);
    const total =
      Number(r.adet) * Number(r.fiyat);
    const withKdv =
      total + (total * Number(r.kdv)) / 100;
    return r.currency === "TRY"
      ? withKdv
      : Number((withKdv * fx).toFixed(2));
  };

  const toplamTL = () =>
    rows.reduce(
      (sum, r) =>
        sum + (isNaN(rowTL(r)) ? 0 : rowTL(r)),
      0
    );

  // 💾 Kaydet
  const handleSave = async () => {
    if (!cariId) {
      alert("⚠️ Tedarikçi seçin");
      return;
    }
    if (!token) {
      alert("⚠️ Giriş yapınız");
      return;
    }

    try {
      for (const r of rows) {
        // Boş satırları atla
        if (!r.ad && !r.barkod) continue;

        let productId = r.productId;

        // 🔹 Ürün yoksa → Product tablosuna otomatik ekle (yeni Product modeli)
        if (!productId && r.ad.trim() !== "") {
          const body = {
            name: r.ad,
            barcode: r.barkod || "",
            barkod: r.barkod || "",
            priceTl:
              r.currency === "TRY"
                ? Number(r.fiyat || 0)
                : 0,
            vatRate: Number(r.kdv || 20),
            stock: 0,
          };

          const res = await fetch(
            "/api/products/add",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(body),
            }
          );

          const created = await res.json();

          if (!res.ok || !created?.success) {
            console.error(
              "Ürün oluşturulamadı:",
              created
            );
          } else {
            productId =
              created.product?._id || "";
          }
        }

        if (!productId) continue;

        const fx = effectiveRate(r.currency);
        const totalTRY = rowTL(r);

        // 🔹 Cari hareketi
        await fetch(
          "/api/cari/transactions",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              accountId: cariId,
              productId,
              type: "purchase",
              quantity: Number(r.adet),
              unitPrice: Number(r.fiyat),
              currency: r.currency,
              fxRate:
                r.currency === "TRY"
                  ? 1
                  : fx,
              totalTRY,
              invoiceDate:
                header.tarih || null,
              invoiceNo:
                header.belgeNo || "",
              orderNo:
                header.siparisNo || "",
              note: header.aciklama || "",
            }),
          }
        );

        // 🔹 Stok güncelle (pozitif → alış)
        await fetch(
          "/api/urunler/update-stock",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              productId,
              delta: Number(r.adet),
              reason: "purchase",
            }),
          }
        );
      }

      alert("✅ Ürün alışı kaydedildi!");
      setRows([{ ...emptyRow }]);
    } catch (err) {
      console.error("Alış kaydetme hatası:", err);
      alert(
        "Alış kaydedilirken bir hata oluştu, konsolu kontrol edin."
      );
    }
  };

  // 🧾 PDF – Ürün Alış Fişi (A4 Dikey)
  const handlePdf = () => {
    if (!rows.length) {
      alert("Liste boş");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    // Başlık
    doc.setFontSize(16);
    doc.text(
      "ÜRÜN ALIŞ FİŞİ",
      105,
      15,
      { align: "center" }
    );

    // Üst bilgiler
    doc.setFontSize(10);
    let y = 25;

    const cari = cariler.find(
      (c) => c._id === cariId
    );

    doc.text(
      `Tedarikçi : ${
        cari ? cari.ad : "-"
      }`,
      10,
      y
    );
    y += 6;
    doc.text(
      `Tarih     : ${
        header.tarih || "-"
      }`,
      10,
      y
    );
    y += 6;
    doc.text(
      `Fatura No : ${
        header.belgeNo || "-"
      }`,
      10,
      y
    );
    doc.text(
      `Sipariş No : ${
        header.siparisNo || "-"
      }`,
      110,
      y
    );
    y += 6;
    doc.text(
      `Açıklama  : ${
        header.aciklama || "-"
      }`,
      10,
      y
    );
    y += 10;

    // Tablo başlığı
    const colX = [
      10, 25, 70, 110, 135, 155, 180,
    ];
    doc.setFontSize(9);

    doc.setFillColor(230, 230, 230);
    doc.rect(10, y - 5, 190, 7, "F");

    const headTitles = [
      "#",
      "Barkod",
      "Ürün",
      "Adet",
      "Fiyat",
      "KDV",
      "Tutar (TL)",
    ];

    headTitles.forEach((txt, idx) => {
      doc.text(txt, colX[idx], y - 1);
    });

    y += 4;

    // Satırlar
    rows.forEach((r, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const lineY = y + 5;
      const tl = rowTL(r);

      doc.text(
        String(index + 1),
        colX[0],
        lineY
      );
      doc.text(
        r.barkod || "-",
        colX[1],
        lineY
      );
      doc.text(
        (r.ad || "").substring(0, 30),
        colX[2],
        lineY
      );
      doc.text(
        String(r.adet || 0),
        colX[3],
        lineY,
        { align: "right" }
      );
      doc.text(
        `${Number(
          r.fiyat || 0
        ).toFixed(2)} ${r.currency}`,
        colX[4],
        lineY,
        { align: "right" }
      );
      doc.text(
        `%${r.kdv}`,
        colX[5],
        lineY,
        { align: "right" }
      );
      doc.text(
        `₺${Number(tl).toFixed(2)}`,
        colX[6],
        lineY,
        { align: "right" }
      );

      y += 6;
    });

    // Genel toplam
    y += 8;
    doc.setFontSize(11);
    doc.text(
      `GENEL TOPLAM: ₺${toplamTL().toFixed(
        2
      )}`,
      200,
      y,
      { align: "right" }
    );

    doc.save(
      `urun-alis-${Date.now()}.pdf`
    );
  };

  // ================== JSX ==================
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">
        📦 Ürün Alışı
      </h2>

      {/* Üst bilgi + Kur kartı */}
      <div className="bg-white rounded border p-3 space-y-3 text-sm">
        <div className="flex flex-wrap gap-3">
          <select
            className="border rounded px-2 py-1 min-w-[180px]"
            value={cariId}
            onChange={(e) =>
              setCariId(e.target.value)
            }
          >
            <option value="">
              Tedarikçi Seç *
            </option>
            {cariler.map((c) => (
              <option
                key={c._id}
                value={c._id}
              >
                {c.ad}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="border rounded px-2 py-1"
            value={header.tarih}
            onChange={(e) =>
              setHeader((h) => ({
                ...h,
                tarih: e.target.value,
              }))
            }
          />

          <input
            className="border rounded px-2 py-1"
            placeholder="Fatura No"
            value={header.belgeNo}
            onChange={(e) =>
              setHeader((h) => ({
                ...h,
                belgeNo: e.target.value,
              }))
            }
          />

          <input
            className="border rounded px-2 py-1"
            placeholder="Sipariş No"
            value={header.siparisNo}
            onChange={(e) =>
              setHeader((h) => ({
                ...h,
                siparisNo: e.target.value,
              }))
            }
          />

          <input
            className="border rounded px-2 py-1 flex-1 min-w-[200px]"
            placeholder="Açıklama"
            value={header.aciklama}
            onChange={(e) =>
              setHeader((h) => ({
                ...h,
                aciklama: e.target.value,
              }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <b>Kur:</b>
          {loadingRates
            ? "Yükleniyor..."
            : `USD ₺${rates.USD} | EUR ₺${rates.EUR}`}
          <button
            onClick={fetchRates}
            className="px-2 py-1 bg-gray-100 border rounded"
          >
            Güncelle
          </button>

          <span className="ml-4">
            USD:
            <input
              className="border rounded px-1 w-20 ml-1"
              value={manualRates.USD}
              onChange={(e) =>
                setManualRates((m) => ({
                  ...m,
                  USD: e.target.value,
                }))
              }
            />
          </span>

          <span>
            EUR:
            <input
              className="border rounded px-1 w-20 ml-1"
              value={manualRates.EUR}
              onChange={(e) =>
                setManualRates((m) => ({
                  ...m,
                  EUR: e.target.value,
                }))
              }
            />
          </span>
        </div>
      </div>

      {/* Satır tablosu */}
      <table className="w-full border text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-1 border">
              Barkod
            </th>
            <th className="p-1 border">
              Ürün
            </th>
            <th className="p-1 border">
              Adet
            </th>
            <th className="p-1 border">
              Fiyat
            </th>
            <th className="p-1 border">
              PB
            </th>
            <th className="p-1 border">
              KDV
            </th>
            <th className="p-1 border">
              TL
            </th>
            <th className="p-1 border w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t"
            >
              <td className="p-1 border">
                <input
                  className="input w-full"
                  value={r.barkod}
                  onChange={(e) =>
                    handleBarkod(
                      i,
                      e.target.value
                    )
                  }
                />
              </td>
              <td className="p-1 border">
                <input
                  list="urunList"
                  className="input w-full"
                  value={r.ad}
                  onChange={(e) =>
                    handleUrunAd(
                      i,
                      e.target.value
                    )
                  }
                />
              </td>
              <td className="p-1 border">
                <input
                  className="input w-16"
                  value={r.adet}
                  onChange={(e) =>
                    updateRow(
                      i,
                      "adet",
                      e.target.value
                    )
                  }
                />
              </td>
              <td className="p-1 border">
                <input
                  className="input w-20"
                  value={r.fiyat}
                  onChange={(e) =>
                    updateRow(
                      i,
                      "fiyat",
                      e.target.value
                    )
                  }
                />
              </td>
              <td className="p-1 border">
                <select
                  className="input"
                  value={r.currency}
                  onChange={(e) =>
                    updateRow(
                      i,
                      "currency",
                      e.target.value
                    )
                  }
                >
                  <option>TRY</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </td>
              <td className="p-1 border">
                <select
                  className="input w-16"
                  value={r.kdv}
                  onChange={(e) =>
                    updateRow(
                      i,
                      "kdv",
                      e.target.value
                    )
                  }
                >
                  {[0, 1, 8, 10, 20].map(
                    (k) => (
                      <option
                        key={k}
                        value={k}
                      >
                        %{k}
                      </option>
                    )
                  )}
                </select>
              </td>
              <td className="p-1 border text-right">
                ₺
                {Number(
                  rowTL(r) || 0
                ).toFixed(2)}
              </td>
              <td className="p-1 border text-center">
                <button
                  className="text-red-600"
                  onClick={() =>
                    removeRow(i)
                  }
                >
                  ✖
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <datalist id="urunList">
        {Array.isArray(urunler) &&
          urunler.map((u) => (
            <option
              key={u._id}
              value={u.name || u.ad}
            />
          ))}
      </datalist>

      {/* Alt butonlar */}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={addRow}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          + Satır
        </button>

        <span className="ml-auto font-semibold">
          Toplam: ₺
          {toplamTL().toFixed(2)}
        </span>

        <button
          onClick={handlePdf}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          🧾 PDF
        </button>

        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Kaydet ✅
        </button>
      </div>
    </div>
  );
}
