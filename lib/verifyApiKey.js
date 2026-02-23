import dbConnect from "@/lib/mongodb";
import ApiKey from "@/models/ApiKey";

export async function verifyApiKey(req) {
  await dbConnect();

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) throw new Error("API key gerekli");

  const cleanKey = apiKey.trim();

  const keyDoc = await ApiKey.findOne({
    key: cleanKey,
    active: true,
  });

  if (!keyDoc) throw new Error("Geçersiz API key");

  return keyDoc;
}