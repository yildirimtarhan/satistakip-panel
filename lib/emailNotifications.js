/**
 * E-posta bildirimleri: hoşgeldin, şifre sıfırlama linki, şifre değişti, yeni sipariş.
 * Brevo (lib/mail/sendMail.js) kullanır. BREVO_API_KEY yoksa gönderim atlanır (hata fırlatmaz).
 */

import { sendMailApiBrevo } from "@/lib/mail/sendMail";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const APP_NAME = process.env.SMTP_FROM_NAME || "Satış Takip";

async function safeSend(promiseOrFn) {
  try {
    const p = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
    const r = await p;
    return r?.ok === false ? null : r;
  } catch (err) {
    const msg = err?.message || "";
    // Brevo/SMTP yapılandırılmamışsa sessizce atla (kullanıcı SMTP veya başka yöntem kullanıyor olabilir)
    if (msg.includes("BREVO_API_KEY") || msg.includes("env eksik")) return null;
    console.error("[emailNotifications]", msg || err);
    return null;
  }
}

/** Hoşgeldiniz maili — üye olduğunda */
export async function sendWelcomeEmail(to, userName = "") {
  const name = (userName || "Kullanıcı").trim() || "Kullanıcı";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Hoş Geldiniz! 🎉</h2>
      <p>Merhaba <strong>${escapeHtml(name)}</strong>,</p>
      <p><strong>${escapeHtml(APP_NAME)}</strong> ailesine kaydınız alındı. Hesabınız admin onayından sonra giriş yapabileceksiniz.</p>
      <p>Giriş sayfası: <a href="${escapeHtml(BASE_URL)}/auth/login">${escapeHtml(BASE_URL)}/auth/login</a></p>
      <p>Sorularınız için destek ekibimizle iletişime geçebilirsiniz.</p>
      <p style="color: #718096; font-size: 12px; margin-top: 24px;">Bu e-posta otomatik gönderilmiştir.</p>
    </div>`;
  const text = `Hoş Geldiniz! Merhaba ${name}, ${APP_NAME} ailesine kaydınız alındı. Giriş: ${BASE_URL}/auth/login`;
  return safeSend(() => sendMailApiBrevo({ to, subject: `Hoş Geldiniz - ${APP_NAME}`, html, text }));
}

/** Şifre sıfırlama linki maili. Başarı: { ok: true }. Brevo 4xx: { ok: false, error }. Env eksik/exception: null */
export async function sendPasswordResetEmail(to, resetLink) {
  const link = resetLink || `${BASE_URL}/auth/reset-password?email=${encodeURIComponent(to)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Şifre Sıfırlama</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <p><a href="${escapeHtml(link)}" style="color: #2563eb;">Şifremi sıfırla</a></p>
      <p style="word-break: break-all; font-size: 12px; color: #718096;">${escapeHtml(link)}</p>
      <p>Bu işlemi siz yapmadıysanız bu e-postayı dikkate almayın. Link 24 saat geçerlidir.</p>
      <p style="color: #718096; font-size: 12px; margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
    </div>`;
  const text = `Şifre sıfırlama: ${link} — Bu işlemi siz yapmadıysanız dikkate almayın.`;
  try {
    const result = await sendMailApiBrevo({ to, subject: `Şifre Sıfırlama - ${APP_NAME}`, html, text });
    if (result && result.ok === true) return { ok: true };
    const errMsg = result?.error || result?.details?.message || "Brevo ile gönderilemedi.";
    return { ok: false, error: errMsg };
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("BREVO_API_KEY") || msg.includes("SMTP_FROM_EMAIL") || msg.includes("env eksik")) return null;
    console.error("[emailNotifications] sendPasswordResetEmail:", msg);
    return null;
  }
}

/** Şifre değiştirildi onay maili */
export async function sendPasswordChangedEmail(to) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Şifreniz Güncellendi</h2>
      <p>Hesabınızın şifresi başarıyla değiştirildi.</p>
      <p>Bu işlemi siz yapmadıysanız hemen destek ile iletişime geçin.</p>
      <p><a href="${escapeHtml(BASE_URL)}/auth/login">Giriş yap</a></p>
      <p style="color: #718096; font-size: 12px; margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
    </div>`;
  const text = "Hesabınızın şifresi güncellendi. Giriş: " + BASE_URL + "/auth/login";
  return safeSend(() => sendMailApiBrevo({ to, subject: `Şifre Güncellendi - ${APP_NAME}`, html, text }));
}

/** Yeni sipariş bildirimi — kullanıcıya mail */
export async function sendNewOrderEmail(to, orderNumber, source = "Pazaryeri") {
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const ordersUrl = source === "Hepsiburada" ? `${BASE_URL}/dashboard/hepsiburada/orders` : `${BASE_URL}/dashboard/n11/orders`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Yeni Sipariş Geldi 📦</h2>
      <p><strong>Sipariş no:</strong> ${escapeHtml(String(orderNumber))}</p>
      <p><strong>Kaynak:</strong> ${escapeHtml(String(source))}</p>
      <p>Panelden siparişi görüntüleyebilir ve işleme alabilirsiniz.</p>
      <p><a href="${escapeHtml(ordersUrl)}">Siparişlere git</a> · <a href="${escapeHtml(dashboardUrl)}">Dashboard</a></p>
      <p style="color: #718096; font-size: 12px; margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
    </div>`;
  const text = `Yeni sipariş: ${orderNumber} (${source}). ${ordersUrl}`;
  return safeSend(() => sendMailApiBrevo({ to, subject: `Yeni Sipariş: ${orderNumber} - ${APP_NAME}`, html, text }));
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
