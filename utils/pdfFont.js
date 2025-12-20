// /utils/pdfFont.js
import RobotoRegularBase64 from "@/utils/robotoRegularBase64";

let registered = false;

export function registerFont(doc) {
  // aynı dokümana tekrar tekrar eklemeyelim
  if (!registered) {
    doc.addFileToVFS("Roboto-Regular.ttf", RobotoRegularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    registered = true;
  }
  doc.setFont("Roboto");
}
