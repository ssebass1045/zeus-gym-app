const EVOLUTION_BASE_URL = (
  process.env.EVOLUTION_API_URL ||
  process.env.WASENDER_BASE_URL ||
  ""
).replace(/\/+$/, "");

const getEvolutionApiKey = () =>
  process.env.EVOLUTION_API_KEY || process.env.WASENDER_SESSION_API_KEY;

const getEvolutionInstanceName = () => process.env.EVOLUTION_INSTANCE_NAME;

const normalizeToEvolutionNumber = (rawPhone) => {
  const e164 = normalizeToE164CO(rawPhone);
  if (!e164) return null;
  return e164.replace(/\D/g, "");
};

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

const validateEvolutionConfig = ({ requireNumber } = {}) => {
  const apiKey = getEvolutionApiKey();
  const instanceName = getEvolutionInstanceName();
  if (!EVOLUTION_BASE_URL) throw new Error("Missing EVOLUTION_API_URL.");
  if (!apiKey) throw new Error("Missing EVOLUTION_API_KEY.");
  if (!instanceName) throw new Error("Missing EVOLUTION_INSTANCE_NAME.");
  if (requireNumber && !requireNumber.number)
    throw new Error("Invalid WhatsApp number.");
  return { apiKey, instanceName };
};

const getConnectionState = async () => {
  const { apiKey, instanceName } = validateEvolutionConfig();
  const res = await fetch(
    `${EVOLUTION_BASE_URL}/instance/connectionState/${encodeURIComponent(
      instanceName,
    )}`,
    {
      method: "GET",
      headers: {
        apikey: apiKey,
      },
    },
  );

  const bodyText = await res.text();
  let bodyJson = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = { raw: bodyText };
  }

  if (!res.ok) {
    const err = new Error(`Evolution connectionState failed: ${res.status}`);
    err.status = res.status;
    err.response = bodyJson;
    throw err;
  }

  return bodyJson;
};

const sendTextMessage = async ({ to, text }) => {
  const number = normalizeToEvolutionNumber(to);
  const { apiKey, instanceName } = validateEvolutionConfig({
    requireNumber: { number },
  });
  if (!number) throw new Error("Invalid WhatsApp number.");

  const res = await fetch(
    `${EVOLUTION_BASE_URL}/message/sendText/${encodeURIComponent(
      instanceName,
    )}`,
    {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number,
        text,
        delay: 1200,
        linkPreview: false,
      }),
    },
  );

  const bodyText = await res.text();
  let bodyJson = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = { raw: bodyText };
  }

  if (!res.ok) {
    const err = new Error(`Evolution sendText failed: ${res.status}`);
    err.status = res.status;
    err.response = bodyJson;
    throw err;
  }

  return bodyJson;
};

module.exports = {
  normalizeToE164CO,
  sendTextMessage,
  getConnectionState,
};
