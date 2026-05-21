const { db } = require("./firebaseAdmin");
const { normalizeToE164CO, sendTextMessage } = require("./wasender");

const TIME_ZONE = process.env.NOTIFICATIONS_TIME_ZONE || "America/Bogota";
const PAYMENT_NEQUI = process.env.PAYMENT_NEQUI || "3105302619";
const PAYMENT_BANCOLOMBIA = process.env.PAYMENT_BANCOLOMBIA || "95950171988";
const GYM_NAME = process.env.GYM_NAME || "ZEUS GYM";

const formatDateCO = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const getTodayIsoCO = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
};

const diffDays = (fromIso, toIso) => {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

const notificationsCollection = () => db.collection("whatsappNotifications");

const buildDocId = ({ userId, type, dayKey }) => `${userId}_${type}_${dayKey}`;

const shouldSendTypeForUser = ({ user, todayIso }) => {
  if (!user) return [];
  if (user.plan === "Tiquetera") return [];
  if (!user.fechaVencimiento) return [];

  const expiryIso = String(user.fechaVencimiento).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryIso)) return [];

  const daysToExpiry = diffDays(todayIso, expiryIso);

  const types = [];
  if (daysToExpiry === 3)
    types.push({
      type: "pre_expiry_3",
      dayKey: todayIso,
      meta: { daysToExpiry },
    });
  if (daysToExpiry === 0)
    types.push({ type: "expiry", dayKey: todayIso, meta: { daysToExpiry } });

  const daysSinceExpired = -daysToExpiry;
  if (daysSinceExpired >= 1 && daysSinceExpired <= 5) {
    types.push({
      type: `post_expiry_day_${daysSinceExpired}`,
      dayKey: todayIso,
      meta: { daysSinceExpired },
    });
  }
  if (daysSinceExpired >= 6 && daysSinceExpired <= 15) {
    types.push({
      type: `post_expiry_day_${daysSinceExpired}`,
      dayKey: todayIso,
      meta: { daysSinceExpired },
    });
  }
  return types;
};

const buildMessage = ({ user, notifType }) => {
  const name = user?.nombre ? String(user.nombre).trim() : "Hola";
  const expiry = formatDateCO(user?.fechaVencimiento);
  const payLine = `Puedes pagar por Nequi ${PAYMENT_NEQUI} o Bancolombia Ahorros ${PAYMENT_BANCOLOMBIA} y enviarnos el comprobante por este WhatsApp.`;

  if (notifType === "welcome") {
    const plan = user?.plan ? String(user.plan) : "tu plan";
    return `${name}, bienvenid@ a ${GYM_NAME}. Quedaste registrad@ con ${plan} y tu vencimiento es ${expiry}. ¡Vamos con toda!`;
  }
  if (notifType === "measurement") {
    return `${name}, registramos tu medición en ${GYM_NAME}. Sigue así, la constancia lo es todo.`;
  }
  if (notifType === "pre_expiry_3") {
    return `${name}, tu membresía en ${GYM_NAME} vence en 3 días (fecha ${expiry}). ${payLine}`;
  }
  if (notifType === "expiry") {
    return `${name}, tu membresía en ${GYM_NAME} vence hoy (${expiry}). ${payLine}`;
  }
  if (notifType.startsWith("post_expiry_day_")) {
    const day = Number(notifType.replace("post_expiry_day_", ""));
    if (day >= 1 && day <= 5) {
      return `${name}, tu membresía en ${GYM_NAME} está vencida desde ${expiry}. ${payLine}`;
    }
    return `${name}, hace ${day} días venció tu membresía (${expiry}). ¿Hay algo en lo que podamos ayudarte para que vuelvas? Te esperamos con toda en ${GYM_NAME}.`;
  }
  if (notifType === "renewal") {
    return `${name}, tu membresía en ${GYM_NAME} fue renovada. Nuevo vencimiento: ${expiry}. Gracias por seguir entrenando con nosotros.`;
  }
  return `${name}, ${GYM_NAME}.`;
};

const upsertLog = async ({ docId, data }) => {
  const ref = notificationsCollection().doc(docId);
  await ref.set(data, { merge: true });
  return ref;
};

const sendAndLog = async ({ user, notifType, dayKey, trigger }) => {
  const userId = user.id;
  const phoneE164 = normalizeToE164CO(user.telefono);
  if (!phoneE164) {
    return { skipped: true, reason: "invalid_phone" };
  }

  const docId = buildDocId({ userId, type: notifType, dayKey });
  const ref = notificationsCollection().doc(docId);
  const existing = await ref.get();
  if (existing.exists && existing.data()?.status === "sent") {
    return { skipped: true, reason: "already_sent" };
  }

  const text = buildMessage({ user, notifType });
  const base = {
    userId,
    telefono: phoneE164,
    type: notifType,
    dayKey,
    trigger,
    plan: user.plan || null,
    fechaVencimiento: user.fechaVencimiento || null,
    nombre: user.nombre || null,
    updatedAt: new Date().toISOString(),
  };

  const attempts = (existing.exists ? existing.data()?.attempts || 0 : 0) + 1;
  await upsertLog({ docId, data: { ...base, attempts, status: "pending" } });

  try {
    const response = await sendTextMessage({ to: phoneE164, text });
    await upsertLog({
      docId,
      data: {
        ...base,
        attempts,
        status: "sent",
        sentAt: new Date().toISOString(),
        response,
      },
    });
    return { sent: true, docId };
  } catch (error) {
    await upsertLog({
      docId,
      data: {
        ...base,
        attempts,
        status: "error",
        error: {
          message: error.message,
          status: error.status || null,
          response: error.response || null,
        },
      },
    });
    return { sent: false, error: error.message, docId };
  }
};

const runDailyNotifications = async ({ limit = 200 } = {}) => {
  const todayIso = getTodayIsoCO();
  const snap = await db.collection("users").get();

  let considered = 0;
  let candidates = 0;
  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    if (attempted >= limit) break;
    const user = { id: doc.id, ...doc.data() };
    considered++;

    const sendTypes = shouldSendTypeForUser({ user, todayIso });
    if (!sendTypes.length) continue;

    candidates++;

    for (const t of sendTypes) {
      if (attempted >= limit) break;
      attempted++;
      const r = await sendAndLog({
        user,
        notifType: t.type,
        dayKey: t.dayKey,
        trigger: "cron",
      });
      if (r?.sent) sent++;
      else if (r?.skipped) skipped++;
      else errors++;
    }
  }

  return {
    todayIso,
    considered,
    candidates,
    attempted,
    sent,
    skipped,
    errors,
    limit,
  };
};

const sendRenewalNotification = async ({ userId }) => {
  const todayIso = getTodayIsoCO();
  const userDoc = await db.collection("users").doc(String(userId)).get();
  if (!userDoc.exists) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const user = { id: userDoc.id, ...userDoc.data() };
  return sendAndLog({
    user,
    notifType: "renewal",
    dayKey: todayIso,
    trigger: "renewal",
  });
};

const sendWelcomeNotification = async ({ userId }) => {
  const todayIso = getTodayIsoCO();
  const userDoc = await db.collection("users").doc(String(userId)).get();
  if (!userDoc.exists) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const user = { id: userDoc.id, ...userDoc.data() };
  return sendAndLog({
    user,
    notifType: "welcome",
    dayKey: todayIso,
    trigger: "welcome",
  });
};

const sendMeasurementNotification = async ({ userId, date }) => {
  const dayKey = date || getTodayIsoCO();
  const userDoc = await db.collection("users").doc(String(userId)).get();
  if (!userDoc.exists) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const user = { id: userDoc.id, ...userDoc.data() };
  return sendAndLog({
    user,
    notifType: "measurement",
    dayKey,
    trigger: "measurement",
  });
};

const sendNotificationForUser = async ({ userId, type, dayKey }) => {
  const todayIso = getTodayIsoCO();
  const userDoc = await db.collection("users").doc(String(userId)).get();
  if (!userDoc.exists) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const user = { id: userDoc.id, ...userDoc.data() };
  return sendAndLog({
    user,
    notifType: type,
    dayKey: dayKey || todayIso,
    trigger: "manual",
  });
};

module.exports = {
  runDailyNotifications,
  sendRenewalNotification,
  sendWelcomeNotification,
  sendMeasurementNotification,
  sendNotificationForUser,
};
