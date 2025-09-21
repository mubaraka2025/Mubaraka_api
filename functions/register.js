// functions/register.js
const admin = require("firebase-admin");

// Initialisation Firebase si pas déjà fait
if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountEnv) {
    throw new Error("La variable d'environnement FIREBASE_SERVICE_ACCOUNT n’est pas définie !");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountEnv);
  } catch (err) {
    throw new Error("Impossible de parser FIREBASE_SERVICE_ACCOUNT : " + err.message);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mubaraka-capital-investissemen-default-rtdb.europe-west1.firebasedatabase.app"
  });
}

const db = admin.database();

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: "Méthode non autorisée" }) };
    }

    const { email, username, numero, pays, password, codeParrain } = JSON.parse(event.body || "{}");

    if (!email || !username || !numero || !pays || !password) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Champs obligatoires manquants" }) };
    }

    // Vérification si l’email ou le numéro existe déjà
    const usersSnap = await db.ref("users").orderByChild("email").equalTo(email).once("value");
    if (usersSnap.exists()) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Email déjà utilisé" }) };
    }

    const usersSnapNum = await db.ref("users").orderByChild("numero").equalTo(numero).once("value");
    if (usersSnapNum.exists()) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Numéro déjà utilisé" }) };
    }

    // Création utilisateur Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      displayName: username,
      phoneNumber: numero,
      password
    });

    // Génération du code de parrainage
    const clean = username.replace(/\s+/g, "").toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const myReferralCode = clean.substring(0, 3) + rand;
    const referralLink = `https://mubarakacapital.com/?parrain=${myReferralCode}`;

    const userData = {
      username,
      email,
      pays,
      numero,
      codeParrainage: codeParrain || null,
      referralCode: myReferralCode,
      referralLink,
      createdAt: Date.now(),
      mainBalance: 0,
      bonusParrainage: 0,
      lastGainTimestamp: Date.now(),
      vipPlan: "vip-0"
    };

    await db.ref(`users/${userRecord.uid}`).set(userData);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Utilisateur inscrit avec succès", uid: userRecord.uid })
    };

  } catch (error) {
    console.error("Erreur inscription:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message }) };
  }
};
