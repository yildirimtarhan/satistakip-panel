export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST" });

  res.setHeader("Set-Cookie", [
    `token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`,
  ]);

  return res.status(200).json({ message: "Logged out" });
}
