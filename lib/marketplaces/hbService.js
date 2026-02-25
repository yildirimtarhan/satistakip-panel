import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";

export async function getHBSettings({ companyId, userId }) {
  await dbConnect();
  let s = null;
  if (companyId) s = await Settings.findOne({ companyId });
  if (!s && userId) s = await Settings.findOne({ userId });
  const hb = s?.hepsiburada || {};
  return {
    merchantId: hb.merchantId || process.env.HB_MERCHANT_ID || "",
    username:   hb.username   || process.env.HB_USERNAME    || "",
    password:   hb.password   || process.env.HB_PASSWORD    || "",
    testMode:   hb.testMode   ?? (process.env.HB_TEST_MODE === "true"),
  };
}

export function hbBaseUrl(testMode) {
  return testMode
    ? "https://sit.mpop.hepsiburada.com"
    : "https://mpop.hepsiburada.com";
}

export async function getHBToken(username, password, testMode = false) {
  const axios = (await import("axios")).default;
  const base = hbBaseUrl(testMode);
  const res = await axios.post(
    `${base}/api/authenticate`,
    { username, password, authenticationType: "INTEGRATOR" },
    { headers: { "Content-Type": "application/json" }, timeout: 12000 }
  );
  const token = res.data?.token || res.data?.jwt;
  if (!token) throw new Error("Token alinamadi: " + JSON.stringify(res.data));
  return token;
}
