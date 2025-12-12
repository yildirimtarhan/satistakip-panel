export async function sendMail({ to, subject, html }) {
  console.log("📧 Mail gönderildi:", { to, subject });
  return true;
}
