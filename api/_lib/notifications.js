const { db } = require("./firebaseAdmin");
const {
  normalizeToE164CO,
  sendTextMessage,
  getConnectionState,
} = require("./wasender");

const TIME_ZONE = process.env.NOTIFICATIONS_TIME_ZONE || "America/Bogota";
const PAYMENT_NEQUI = process.env.PAYMENT_NEQUI || "3105302619";
const PAYMENT_BANCOLOMBIA = process.env.PAYMENT_BANCOLOMBIA || "95950171988";
const GYM_NAME = process.env.GYM_NAME || "ZEUS GYM";
const DEVELOPER_TEST_PHONE = process.env.DEVELOPER_TEST_PHONE || "3105302619";

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

const getShortName = (user) => {
  const fullName = user?.nombre ? String(user.nombre).trim() : "";
  return fullName.split(/\s+/).filter(Boolean)[0] || "Hola";
};

const normalizeMonthDay = (isoDate) => {
  if (!isoDate) return null;
  const raw = String(isoDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw.slice(5);
};

const isBirthdayToday = ({ user, todayIso }) =>
  !!normalizeMonthDay(user?.cumpleanos) &&
  normalizeMonthDay(user?.cumpleanos) === String(todayIso).slice(5);

const prettifyMeasureKey = (key) => {
  const labels = {
    cuello: "Cuello",
    brazo: "Brazo",
    biceps: "Biceps",
    pecho: "Pecho",
    cintura: "Cintura",
    cintura_bajo_ombligo: "Cintura baja",
    gluteo: "Gluteo",
    gluteo_cadera: "Gluteo / cadera",
    pierna: "Pierna",
  };
  return labels[key] || key.replace(/_/g, " ");
};

const formatMeasureValue = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return `${num.toFixed(1)} cm`;
};

const buildPaymentLine = () =>
  [
    `Puedes pagar por Nequi al ${PAYMENT_NEQUI} o a Bancolombia Ahorros ${PAYMENT_BANCOLOMBIA}.`,
    "Si haces el pago por ahi, puedes enviarnos el comprobante por este mismo WhatsApp.",
    "Y si prefieres, tambien puedes pagar en efectivo directamente en el gimnasio 💪",
  ].join(" ");

const buildMeasurementSummary = (measurement) => {
  const entries = Object.entries(measurement?.measures || {})
    .map(([key, value]) => {
      const formatted = formatMeasureValue(value);
      if (!formatted) return null;
      return `• ${prettifyMeasureKey(key)}: ${formatted}`;
    })
    .filter(Boolean);

  if (!entries.length) return "";
  return entries.join("\n");
};

const buildMeasurementChanges = ({ measurement, previousMeasurement }) => {
  if (!measurement?.measures || !previousMeasurement?.measures) return "";

  const changes = Object.keys(measurement.measures)
    .map((key) => {
      const current = Number(measurement.measures[key]);
      const previous = Number(previousMeasurement.measures[key]);
      if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
      const diff = Number((current - previous).toFixed(1));
      if (diff === 0) return null;
      const sign = diff > 0 ? "+" : "";
      return `• ${prettifyMeasureKey(key)}: ${sign}${diff.toFixed(1)} cm vs. medicion anterior`;
    })
    .filter(Boolean)
    .slice(0, 3);

  if (!changes.length) return "";
  return changes.join("\n");
};

const getMeasurementContext = async ({ userId, date }) => {
  const snap = await db
    .collection("bodyCompositions")
    .where("userId", "==", String(userId))
    .get();

  const all = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => item?.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const measurement =
    all.find((item) => item.date === date) ||
    all.find((item) => item.date <= date) ||
    all[0] ||
    null;

  if (!measurement) return null;

  const previousMeasurement =
    all.find(
      (item) =>
        item.id !== measurement.id &&
        String(item.date) < String(measurement.date),
    ) || null;

  return { measurement, previousMeasurement };
};

const shouldSendTypeForUser = ({ user, todayIso }) => {
  if (!user) return [];

  const types = [];

  if (isBirthdayToday({ user, todayIso })) {
    types.push({
      type: "birthday",
      dayKey: todayIso,
      meta: {},
    });
  }

  if (!user.fechaVencimiento) return types;

  const expiryIso = String(user.fechaVencimiento).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryIso)) return types;

  const daysToExpiry = diffDays(todayIso, expiryIso);

  if (daysToExpiry === 3) {
    types.push({
      type: "pre_expiry_3",
      dayKey: todayIso,
      meta: { daysToExpiry },
    });
  }
  if (daysToExpiry === 0) {
    types.push({
      type: "expiry",
      dayKey: todayIso,
      meta: { daysToExpiry },
    });
  }

  const daysSinceExpired = -daysToExpiry;
  const postExpiryReminderDays = [2, 5, 10, 15];
  if (postExpiryReminderDays.includes(daysSinceExpired)) {
    types.push({
      type: `post_expiry_day_${daysSinceExpired}`,
      dayKey: todayIso,
      meta: { daysSinceExpired },
    });
  }

  return types;
};

const buildMessage = ({ user, notifType, context = {} }) => {
  const name = getShortName(user);
  const expiry = formatDateCO(user?.fechaVencimiento);
  const paymentLine = buildPaymentLine();
  const measurementDate = formatDateCO(context?.measurement?.date);
  const measurementSummary = buildMeasurementSummary(context?.measurement);
  const measurementChanges = buildMeasurementChanges(context);

  if (notifType === "welcome") {
    const plan = user?.plan ? String(user.plan) : "tu plan";
    return [
      `Hola ${name} 👋 Bienvenid@ a ${GYM_NAME}.`,
      `Nos alegra mucho tenerte con nosotros. Quedaste registrad@ con el plan ${plan} y tu fecha de vencimiento es ${expiry}.`,
      "Vamos paso a paso, con disciplina y buena energia. Aqui estamos para ayudarte a mejorar cada dia 🔥",
    ].join(" ");
  }

  if (notifType === "measurement") {
    return [
      `Hola ${name} 📏 Ya registramos tu medicion de ${measurementDate || "hoy"} en ${GYM_NAME}.`,
      measurementSummary
        ? `Estas son tus medidas:\n${measurementSummary}`
        : "Tu medicion ya quedo guardada en el sistema.",
      measurementChanges
        ? `\n\nCambios frente a tu registro anterior:\n${measurementChanges}`
        : "",
      "\n\nSigue asi, cada pequeño avance cuenta y la constancia siempre termina dando resultado 💪",
    ].join("");
  }

  if (notifType === "birthday") {
    return [
      `Feliz cumpleaños, ${name}! 🎉🎂`,
      `De parte de todo el equipo de ${GYM_NAME}, te deseamos un dia lleno de alegria, salud y muchas bendiciones.`,
      "Gracias por hacer parte de esta familia. Que este nuevo año te traiga mucha fuerza, disciplina y metas cumplidas. Aqui seguimos contigo, entrenando con toda 💙🔥",
    ].join(" ");
  }

  if (notifType === "pre_expiry_3") {
    return [
      `Hola ${name} 👋 Te recordamos con cariño que tu membresia en ${GYM_NAME} vence en 3 dias, el ${expiry}.`,
      "Queremos ayudarte a que sigas en ritmo y no pierdas continuidad en tu proceso.",
      paymentLine,
    ].join(" ");
  }

  if (notifType === "expiry") {
    return [
      `Hola ${name} 💪 Hoy vence tu membresia en ${GYM_NAME} (${expiry}).`,
      "Si deseas renovarla hoy mismo, aqui te dejamos los medios de pago para que nos envies el comprobante y sigas entrenando sin pausa.",
      paymentLine,
    ].join(" ");
  }

  if (notifType.startsWith("post_expiry_day_")) {
    const day = Number(notifType.replace("post_expiry_day_", ""));
    if (day >= 1 && day <= 5) {
      return [
        `Hola ${name} 🌟 Queremos saludarte y recordarte que te extrañamos en ${GYM_NAME}.`,
        `Tu membresia vencio el ${expiry}, pero lo mas importante es que no pierdas ese impulso que llevas.`,
        "Si por ahora te queda mas facil ir entrenando y pagando el dia, tambien lo valoramos mucho. Lo importante es seguir sumando por tu salud y felicitarte por no rendirte 🙌",
      ].join(" ");
    }
    return [
      `Hola ${name} 💙 Pasamos por aqui para enviarte buena energia.`,
      `Ya van ${day} dias desde el vencimiento de tu membresia (${expiry}), y queremos recordarte que siempre tendras las puertas abiertas en ${GYM_NAME}.`,
      "Si has seguido viniendo poco a poco o pagando el dia, te felicitamos por tu disciplina. Y si aun no has podido volver, animo: retomar tambien cuenta. Lo importante es seguir creyendo en ti 🔥",
    ].join(" ");
  }

  if (notifType === "renewal") {
    return [
      `Hola ${name} 🙌 Tu membresia en ${GYM_NAME} ya fue renovada.`,
      `Tu nuevo vencimiento es ${expiry}. Gracias por seguir apostandole a tu proceso y a tu bienestar.`,
      "Vamos con toda por esta nueva etapa 💪",
    ].join(" ");
  }

  if (notifType === "tiquetera_attendance") {
    const remaining = Number(context?.remainingDays);
    const used = Number(context?.usedDays);
    return [
      `Hola ${name} ✅ Registramos tu asistencia de hoy en ${GYM_NAME}.`,
      Number.isFinite(remaining)
        ? `Te quedan ${remaining} dias disponibles en tu tiquetera${Number.isFinite(used) ? ` y llevas ${used} consumidos` : ""}.`
        : "Tu asistencia ya quedo registrada correctamente.",
      expiry ? `Recuerda que tu tiquetera vence el ${expiry}.` : "",
      "Gracias por seguir firme con tu proceso. Cada entrenamiento suma y se nota. Vamos con toda 💪",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return `Hola ${name} � Te escribe ${GYM_NAME}.`;
};

const upsertLog = async ({ docId, data }) => {
  const ref = notificationsCollection().doc(docId);
  await ref.set(data, { merge: true });
  return ref;
};

const sendAndLog = async ({
  user,
  notifType,
  dayKey,
  trigger,
  context = {},
}) => {
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

  const text = buildMessage({ user, notifType, context });
  const base = {
    userId,
    telefono: phoneE164,
    type: notifType,
    dayKey,
    trigger,
    plan: user.plan || null,
    fechaVencimiento: user.fechaVencimiento || null,
    cumpleanos: user.cumpleanos || null,
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
        preview: text,
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
        preview: text,
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

const getUserById = async (userId) => {
  const userDoc = await db.collection("users").doc(String(userId)).get();
  if (!userDoc.exists) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return { id: userDoc.id, ...userDoc.data() };
};

const sendRenewalNotification = async ({ userId }) => {
  const todayIso = getTodayIsoCO();
  const user = await getUserById(userId);
  return sendAndLog({
    user,
    notifType: "renewal",
    dayKey: todayIso,
    trigger: "renewal",
  });
};

const sendWelcomeNotification = async ({ userId }) => {
  const todayIso = getTodayIsoCO();
  const user = await getUserById(userId);
  return sendAndLog({
    user,
    notifType: "welcome",
    dayKey: todayIso,
    trigger: "welcome",
  });
};

const sendMeasurementNotification = async ({ userId, date }) => {
  const dayKey = date || getTodayIsoCO();
  const user = await getUserById(userId);
  const context = await getMeasurementContext({ userId, date: dayKey });
  return sendAndLog({
    user,
    notifType: "measurement",
    dayKey,
    trigger: "measurement",
    context,
  });
};

const sendNotificationForUser = async ({ userId, type, dayKey }) => {
  const todayIso = getTodayIsoCO();
  const user = await getUserById(userId);
  const finalDayKey = dayKey || todayIso;
  const context =
    type === "measurement"
      ? await getMeasurementContext({ userId, date: finalDayKey })
      : {};

  return sendAndLog({
    user,
    notifType: type,
    dayKey: finalDayKey,
    trigger: "manual",
    context,
  });
};

const sendTiqueteraAttendanceNotification = async ({
  userId,
  remainingDays,
  usedDays,
  date,
}) => {
  const dayKey = date || getTodayIsoCO();
  const user = await getUserById(userId);
  return sendAndLog({
    user,
    notifType: "tiquetera_attendance",
    dayKey,
    trigger: "attendance",
    context: {
      remainingDays,
      usedDays,
    },
  });
};

const sendDeveloperTestNotification = async () => {
  const stateResponse = await getConnectionState();
  const state =
    stateResponse?.instance?.state ||
    stateResponse?.state ||
    stateResponse?.status ||
    "unknown";

  if (String(state).toLowerCase() !== "open") {
    const err = new Error(
      `WhatsApp no está conectado. Estado actual: ${state}`,
    );
    err.status = 409;
    err.response = stateResponse;
    throw err;
  }

  const now = new Date().toLocaleString("es-CO", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  });
  const text = [
    `Hola 👋 Esta es una prueba de WhatsApp desde ${GYM_NAME}.`,
    `Instancia: ${process.env.EVOLUTION_INSTANCE_NAME || "sin-configurar"}.`,
    `Fecha: ${now}.`,
  ].join(" ");

  const response = await sendTextMessage({
    to: DEVELOPER_TEST_PHONE,
    text,
  });

  return {
    sent: true,
    to: normalizeToE164CO(DEVELOPER_TEST_PHONE),
    connectionState: state,
    response,
  };
};

module.exports = {
  runDailyNotifications,
  sendRenewalNotification,
  sendWelcomeNotification,
  sendMeasurementNotification,
  sendNotificationForUser,
  sendTiqueteraAttendanceNotification,
  sendDeveloperTestNotification,
};
