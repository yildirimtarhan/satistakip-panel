import dbConnect from "@/lib/mongodb";
import ApiKey from "@/models/ApiKey";
import crypto from "crypto";

export async function verifyApiKey(req) {
  await dbConnect();

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) throw new Error("API key gerekli");

  const keyHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  const keyDoc = await ApiKey.findOne({
    keyHash,
    active: true,
  });

  if (!keyDoc) throw new Error("Geçersiz API key");

  if (keyDoc.expiresAt && new Date() > keyDoc.expiresAt)
    throw new Error("API key süresi dolmuş");

  return keyDoc;
}