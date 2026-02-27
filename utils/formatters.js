// utils/formatters.js

/** N11 createDate "DD/MM/YYYY HH:mm" veya "DD/MM/YYYY" → geçerli Date. Geçersizse null. */
export function parseN11Date(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;
  const parts = s.split(/\s+/);
  const datePart = parts[0] || "";
  const timePart = parts[1] || "00:00";
  const [d, m, y] = datePart.split(/[/.-]/);
  if (!d || !m || !y) return null;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10) - 1;
  const year = parseInt(y, 10);
  const [hh, mm] = (timePart || "0:0").split(":").map((t) => parseInt(t, 10) || 0);
  const date = new Date(year, month, day, hh, mm, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date;
}

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