const { runDailyNotifications } = require("../_lib/notifications");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || req.query?.secret;
    if (token !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const limitRaw = req.query?.limit || (req.body && req.body.limit);
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await runDailyNotifications({
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};
