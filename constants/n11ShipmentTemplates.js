/**
 * N11 teslimat (kargo) şablonu seçenekleri.
 * N11 panelinde Hesabım > Teslimat Bilgilerimiz bölümünde oluşturduğunuz şablon adı
 * ile birebir aynı olmalıdır. Özel şablon adı kullanmak için "Özel" seçip metin girin.
 */
export const N11_SHIPMENT_TEMPLATE_OPTIONS = [
  { value: "", label: "— Seçin (boş bırakılabilir) —" },
  { value: "Alıcı Öder", label: "Alıcı Öder" },
  { value: "Mağaza Öder", label: "Mağaza Öder" },
  { value: "Ücretsiz Kargo", label: "Ücretsiz Kargo" },
  { value: "Ürün", label: "Ürün" },
  { value: "Bandırma", label: "Bandırma" },
  { value: "Sabit Ücret", label: "Sabit Ücret" },
  { value: "Alıcı Öder (Kapıda Ödeme)", label: "Alıcı Öder (Kapıda Ödeme)" },
  { value: "Mağaza Öder (Ücretsiz)", label: "Mağaza Öder (Ücretsiz)" },
  { value: "__CUSTOM__", label: "Özel şablon adı yaz" },
];

export const N11_SHIPMENT_TEMPLATE_CUSTOM_KEY = "__CUSTOM__";
