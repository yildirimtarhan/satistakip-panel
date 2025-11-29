import axios from "axios";

export async function getN11Attributes(categoryId) {
  const APP_KEY = process.env.N11_APP_KEY;
  const APP_SECRET = process.env.N11_APP_SECRET;

  const URL = `https://api.n11.com/rest/category/${categoryId}/attributes`;

  const response = await axios.get(URL, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(APP_KEY + ":" + APP_SECRET).toString("base64"),
    },
  });

  return response.data;
}
