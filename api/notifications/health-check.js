const { verifyIdToken } = require("../_lib/firebaseAdmin");
const { sendDeveloperTestNotification } = require("../_lib/notifications");

const parseAllowedEmails = () => {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const decoded = await verifyIdToken(req.headers.authorization);
  if (!decoded) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const allowedEmails = parseAllowedEmails();
  if (
    allowedEmails.length &&
    decoded.email &&
    !allowedEmails.includes(decoded.email)
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const result = await sendDeveloperTestNotification();
    res.status(200).json({ ok: true, result });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      error: error.message,
      response: error.response || null,
    });
  }
};
