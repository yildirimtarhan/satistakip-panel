import axios from "axios";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export async function getN11Attributes(req, categoryId) {
  const cfg = await getN11SettingsFromRequest(req);

  const URL = `https://api.n11.com/rest/category/${categoryId}/attributes`;

  const response = await axios.get(URL, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(cfg.appKey + ":" + cfg.appSecret).toString("base64"),
    },
  });

  return response.data;
}
