export default async function handler(req, res) {
  res.setHeader('Set-Cookie', 'discord_link=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.status(200).json({ success: true });
}
