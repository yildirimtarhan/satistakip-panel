// utils/pdfFont.js
import DejaVuBase64 from "@/utils/fonts/DejaVuSans.base64";

export function registerFont(doc) {
  doc.addFileToVFS("DejaVu.ttf", DejaVuBase64);
  doc.addFont("DejaVu.ttf", "DejaVu", "normal");
  doc.setFont("DejaVu");
}
