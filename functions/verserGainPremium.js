// functions/verserGainPremium.js
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
    const { vipKey, uid } = event.queryStringParameters || {};

    if (!vipKey || !uid) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Paramètres manquants" }) };
    }

    // Récupérer le VIP Premium
    const vipRef = db.ref(`users/${uid}/vipPremium/${vipKey}`);
    const vipSnap = await vipRef.get();

    if (!vipSnap.exists()) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: "VIP Premium introuvable" }) };
    }

    const vip = vipSnap.val();

    if (vip.status !== "actif") {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "VIP Premium non actif" }) };
    }

    const now = Date.now();
    const dateFin = vip.dateAchat + vip.duree * 24 * 60 * 60 * 1000;

    if (now < dateFin) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Le cycle n'est pas encore terminé" }) };
    }

    // Calculer le gain total
    const totalGain = vip.gainTotal ?? (vip.revenuQuotidien * vip.duree || vip.montant);

    // Vérification si le VIP a déjà été versé
    if (vip.dernierVersement && vip.status === "terminé") {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Les gains ont déjà été versés" }) };
    }

    // Verser dans le solde utilisateur
    const userRef = db.ref(`users/${uid}`);
    await userRef.child("mainBalance").transaction(current => (current || 0) + totalGain);

    // Marquer VIP Premium comme terminé
    await vipRef.update({ status: "terminé", dernierVersement: now });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, versement: totalGain, message: "Gains VIP Premium versés avec succès" })
    };

  } catch (err) {
    console.error("Erreur verserGainPremium:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: err.message || "Erreur interne" }) };
  }
};
