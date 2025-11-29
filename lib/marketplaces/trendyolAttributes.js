import axios from "axios";

export async function getTrendyolAttributes(categoryId) {
  const SUPPLIER_ID = process.env.TRENDYOL_SUPPLIER_ID;
  const API_KEY = process.env.TRENDYOL_API_KEY;
  const API_SECRET = process.env.TRENDYOL_API_SECRET;

  const URL = `https://api.trendyol.com/sapigw/product-categories/${categoryId}/attributes`;

  const response = await axios.get(URL, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(API_KEY + ":" + API_SECRET).toString("base64"),
    },
  });

  return response.data; // attributes listesi
}
