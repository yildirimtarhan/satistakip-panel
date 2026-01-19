// lib/sendEmail.js
import { sendMail } from "./sendMail";

// Eski kod sendEmail(...) çağırıyorsa kırılmasın diye alias
export async function sendEmail(payload) {
  return sendMail(payload);
}

export default sendEmail;
