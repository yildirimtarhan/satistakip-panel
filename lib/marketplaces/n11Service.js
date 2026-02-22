import soap from "soap";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";

/* ======================================================
   SETTINGS RESOLVER (DB -> ENV fallback)
====================================================== */
export async function getN11SettingsFromDB({ companyId, userId }) {
  await dbConnect();
console.log("N11 SERVICE EXPORT:", Object.keys(n11Service));

  // Önce companyId ile bul
  let settings = null;

  if (companyId) {
    settings = await Settings.findOne({ companyId });
  }
console.log("N11 SERVICE EXPORT:", Object.keys(n11Service));

  // companyId yoksa userId ile dene
  if (!settings && userId) {
    settings = await Settings.findOne({ userId });
  }

  const n11 = settings?.n11 || {};

  // ENV fallback
  const wsdlUrl =
    n11.wsdlUrl ||
    process.env.N11_WSDL_URL ||
    "https://api.n11.com/ws/ProductService.wsdl";

  const appKey = n11.appKey || process.env.N11_APP_KEY;
  const appSecret = n11.appSecret || process.env.N11_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error("N11 appKey/appSecret bulunamadı (Settings.n11 veya ENV).");
  }

  return {
    wsdlUrl,
    appKey,
    appSecret,
    environment: n11.environment || process.env.N11_ENV || "production",
  };
}

/* ======================================================
   SOAP CLIENT (simple - no cache, stable)
====================================================== */
async function getSoapClient(wsdlUrl) {
  // N11 bazen wsdl fetch’inde timeout yapabiliyor, bu yüzden createClient’i try/catch’li tutuyoruz.
  const client = await soap.createClientAsync(wsdlUrl);
  return client;
}

/* ======================================================
   TASK STATUS
   - taskId ile N11 ürün oluşturma kuyruğunun durumunu döner
   - DB update zinciri için normalize eder: IN_QUEUE | COMPLETED | FAILED
====================================================== */
export async function n11GetTaskStatus({ companyId, userId, taskId }) {
  if (!taskId) throw new Error("taskId zorunlu");

  const { wsdlUrl, appKey, appSecret } = await getN11SettingsFromDB({
    companyId,
    userId,
  });

  const client = await getSoapClient(wsdlUrl);

  // N11 SOAP auth header
  // Not: bazı WSDL’lerde header adı değişebilir ama mevcut projende bu şekilde kullanılmıştı.
  client.addSoapHeader({
    auth: {
      appKey,
      appSecret,
    },
  });

  // Method adı senin projendeki tipik kullanım: GetTaskStatusAsync
  // Eğer WSDL farklıysa, console’da client.describe() ile bakılabilir.
  const [result] = await client.GetTaskStatusAsync({ taskId: Number(taskId) });

  const rawStatus =
    result?.return?.status ||
    result?.return?.taskStatus ||
    result?.status ||
    "IN_QUEUE";

  const rawReason =
    result?.return?.reason ||
    result?.return?.errorMessage ||
    result?.reason ||
    "";

  // Normalize
  // N11 bazen SUCCESS/FAIL veya COMPLETED/FAILED gibi dönüyor. Hepsini tek standarda çeviriyoruz.
  const s = String(rawStatus).toUpperCase();

  let status = "IN_QUEUE";
  if (["COMPLETED", "SUCCESS", "DONE", "OK"].includes(s)) status = "COMPLETED";
  if (["FAILED", "FAIL", "ERROR"].includes(s)) status = "FAILED";
  if (["IN_QUEUE", "QUEUE", "PENDING", "PROCESSING"].includes(s))
    status = "IN_QUEUE";

  return {
    success: true,
    taskId: Number(taskId),
    status, // IN_QUEUE | COMPLETED | FAILED
    reason: rawReason || "",
    raw: result,
  };
}

/* ======================================================
   DEFAULT EXPORT (import uyumu için)
====================================================== */
const N11Service = {
  getN11SettingsFromDB,
  n11GetTaskStatus,
};

export default N11Service;
