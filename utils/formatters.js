// utils/formatters.js
export function formatCurrency(amount, currency = "TRY") {
  if (amount == null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatPhone(phone) {
  if (!phone) return "-";
  // Türkiye telefon formatı
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
}