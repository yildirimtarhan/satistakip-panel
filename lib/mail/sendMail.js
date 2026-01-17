export async function sendMailApiBrevo({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;

  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi";
  const replyToEmail = process.env.NOTIFY_EMAIL;

  if (!apiKey) throw new Error("BREVO_API_KEY env eksik");
  if (!fromEmail) throw new Error("SMTP_FROM_EMAIL env eksik");

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
    replyTo: replyToEmail ? { email: replyToEmail } : undefined,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("❌ BREVO API MAIL ERROR:", data);
    return {
      ok: false,
      status: response.status,
      error: data?.message || "Brevo API mail gönderimi başarısız",
      details: data,
    };
  }

  console.log("✅ BREVO API MAIL SENT:", data);

  return {
    ok: true,
    messageId: data?.messageId || null,
  };
}

// ✅ eski kodları bozmamak için alias
export async function sendMail({ to, subject, html, text }) {
  return await sendMailApiBrevo({ to, subject, html, text });
}
