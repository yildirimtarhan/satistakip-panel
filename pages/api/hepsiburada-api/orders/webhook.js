// ✅ Hepsiburada Webhook Endpoint
// Bu dosya Hepsiburada tarafından gönderilen sipariş/paket eventlerini yakalar.
// Mevcut sistemi bozmadan event loglama + genişletilebilir yapı eklenmiştir.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  try {
    const event = req.body;

    if (!event || !event.eventType) {
      return res.status(400).json({ message: "Geçersiz webhook payload" });
    }

    console.log("📩 [HB Webhook] Yeni event alındı:", JSON.stringify(event, null, 2));

    // 📌 Hepsiburada'nın gönderdiği event tiplerini burada yakalıyoruz
    switch (event.eventType) {
      case "OrderCreated":
        console.log(`🆕 Sipariş oluşturuldu: ${event.orderNumber || "(numara yok)"}`);
        // 👉 Burada DB'ye kaydetme, bildirim gönderme vb. yapılabilir.
        break;

      case "PackageCreated":
        console.log(`📦 Paket oluşturuldu: ${event.packageNumber || "(paket yok)"}`);
        break;

      case "PackageUnpacked":
        console.log(`📭 Paket unpack edildi: ${event.packageNumber || "(paket yok)"}`);
        break;

      case "AddressChanged":
        console.log(`📍 Adres değiştirildi: ${event.orderNumber || "(numara yok)"}`);
        break;

      default:
        console.log(`⚠️ Tanımsız event tipi: ${event.eventType}`);
    }

    // Hepsiburada webhookları 200 OK bekler, aksi halde tekrar yollar
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook işlenirken hata:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
