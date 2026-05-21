const admin = require("firebase-admin");

const buildCredentialFromEnv = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (rawBase64) {
    return JSON.parse(Buffer.from(rawBase64, "base64").toString("utf8"));
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.REACT_APP_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  return null;
};

if (!admin.apps.length) {
  const credentialJson = buildCredentialFromEnv();
  if (!credentialJson) {
    throw new Error(
      "Missing Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT(_BASE64) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY).",
    );
  }
  admin.initializeApp({ credential: admin.credential.cert(credentialJson) });
}

const db = admin.firestore();

const verifyIdToken = async (authorizationHeader) => {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return admin.auth().verifyIdToken(match[1]);
};

module.exports = { admin, db, verifyIdToken };
