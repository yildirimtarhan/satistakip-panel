/**
 * Hepsiburada kargo teslim etiketi — ortak pazaryeri şablonunu kullanır (10x15 cm profesyonel).
 */
import { getPazaryeriKargoEtiketHtml } from "@/lib/pazaryeriKargoEtiketSablonu";

/**
 * @param {Object} data - orderNumber, packageNumber, trackingNumber, trackingInfoUrl, cargoCompany, recipientName, address, district, city, phone, senderName, firmaAdi
 * @returns {string} HTML
 */
export function getKargoEtiketHtml(data = {}) {
  const trackingNumber = data.trackingNumber || data.trackingInfoCode || "";
  const trackingUrl = data.trackingInfoUrl || (trackingNumber ? `https://kargotakip.hepsiburada.com/?trackingNumber=${encodeURIComponent(trackingNumber)}` : "");
  return getPazaryeriKargoEtiketHtml(
    { ...data, cargoCompany: data.cargoCompany || "Hepsiburada Kargo", trackingInfoUrl: trackingUrl },
    { marketplace: "hepsiburada" }
  );
}
