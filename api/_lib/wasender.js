const WASENDER_BASE_URL =
  process.env.WASENDER_BASE_URL || "https://www.wasenderapi.com";

const normalizeToE164CO = (rawPhone) => {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.length === 10 && onlyDigits.startsWith("3"))
    return `+57${onlyDigits}`;
  if (onlyDigits.length === 12 && onlyDigits.startsWith("57"))
    return `+${onlyDigits}`;
  return null;
};

const sendTextMessage = async ({ to, text }) => {
  const apiKey = process.env.WASENDER_SESSION_API_KEY;
  if (!apiKey) throw new Error("Missing WASENDER_SESSION_API_KEY.");

  const res = await fetch(`${WASENDER_BASE_URL}/api/send-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, text }),
  });

  const bodyText = await res.text();
  let bodyJson = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = { raw: bodyText };
  }

  if (!res.ok) {
    const err = new Error(`Wasender send-message failed: ${res.status}`);
    err.status = res.status;
    err.response = bodyJson;
    throw err;
  }

  return bodyJson;
};

module.exports = { normalizeToE164CO, sendTextMessage };
