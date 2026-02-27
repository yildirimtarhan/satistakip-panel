"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function N11ShipmentTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDefault, setNewDefault] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") || "" : "";

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/n11/shipment-templates", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) return router.push("/auth/login");
    fetchTemplates();
  }, []);

  const saveTemplates = async (list) => {
    setSaving(true);
    try {
      const res = await fetch("/api/n11/shipment-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ templates: list }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || list);
        setNewName("");
        setNewDefault(false);
      } else alert(data.message || "Kaydedilemedi");
    } catch (e) {
      alert("Kayıt sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = () => {
    const name = newName.trim();
    if (!name) return;
    const onlyOneDefault = newDefault;
    const next = templates.map((t) => ({ ...t, isDefault: onlyOneDefault ? false : t.isDefault }));
    next.push({ name, isDefault: onlyOneDefault || next.length === 0 });
    if (onlyOneDefault) next.find((t) => t.name === name).isDefault = true;
    saveTemplates(next);
  };

  const setAsDefault = (name) => {
    const next = templates.map((t) => ({ name: t.name, isDefault: t.name === name }));
    saveTemplates(next);
  };

  const removeTemplate = (name) => {
    if (!confirm(`"${name}" şablonunu silmek istediğinize emin misiniz?`)) return;
    const next = templates.filter((t) => t.name !== name);
    if (next.length && templates.find((t) => t.name === name)?.isDefault) next[0].isDefault = true;
    saveTemplates(next);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">N11 Kargo (Teslimat) Şablonları</h1>
      <p className="text-sm text-gray-500 mb-6">
        N11 panelinizde <strong>Hesabım → Teslimat Bilgilerimiz</strong> bölümünde tanımlı şablon adlarını buraya ekleyin. Ürün gönderirken bu listeden seçim yapabilirsiniz; isimler N11 ile birebir aynı olmalıdır.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800 mb-3">Yeni şablon ekle</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Şablon adı (N11 panelindeki ile aynı)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTemplate()}
                placeholder="Örn: Ücretsiz Kargo, Alıcı Öder"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={newDefault} onChange={(e) => setNewDefault(e.target.checked)} className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              Varsayılan yap
            </label>
            <button
              type="button"
              onClick={addTemplate}
              disabled={saving || !newName.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {saving ? "Kaydediliyor..." : "Ekle"}
            </button>
          </div>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Kayıtlı şablonlar</h2>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
          ) : templates.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">Henüz şablon eklenmedi. Yukarıdan N11 panelinizdeki teslimat şablonu adını ekleyin.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 pr-4 font-medium">Şablon adı</th>
                    <th className="pb-2 pr-4 font-medium w-28">Varsayılan</th>
                    <th className="pb-2 font-medium w-40">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-800">{t.name}</td>
                      <td className="py-3 pr-4">
                        {t.isDefault ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Varsayılan</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAsDefault(t.name)}
                            className="text-orange-600 hover:underline text-xs"
                          >
                            Varsayılan yap
                          </button>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => removeTemplate(t.name)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Not:</strong> Bu sayfa sadece şablon <em>adlarını</em> saklar. Teslimat süresi, ücret vb. ayarlar N11 mağaza panelinden yapılır.
      </div>
    </div>
  );
}
