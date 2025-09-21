// functions/HA-VIP-Verser.js
const admin = require('firebase-admin');

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
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Méthode non autorisée' }) };
    }

    const { vipKey, userUID } = JSON.parse(event.body || '{}');

    if (!vipKey || !userUID) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Paramètres manquants' }) };
    }

    const vipRef = db.ref(`achatsVip/${vipKey}`);
    const userRef = db.ref(`users/${userUID}`);

    const vipSnap = await vipRef.get();
    if (!vipSnap.exists() || vipSnap.val().userUID !== userUID) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: 'VIP introuvable ou non associé à l’utilisateur' }) };
    }

    const vipData = vipSnap.val();
    if (vipData.status !== 'actif') {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'VIP inactif' }) };
    }

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const dernierVersement = vipData.dernierVersement || vipData.date || 0;

    if (now - dernierVersement < ONE_DAY_MS) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Versement déjà effectué aujourd'hui" }) };
    }

    const revenuQuotidien = vipData.revenuQuotidien || 0;

    // Verser le gain quotidien dans le solde de l’utilisateur
    await userRef.child('mainBalance').transaction(balance => (balance || 0) + revenuQuotidien);
    await vipRef.update({ dernierVersement: now });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        versement: revenuQuotidien,
        message: 'Gains versés avec succès'
      })
    };

  } catch (err) {
    console.error('Erreur HA-VIP-Verser:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message || 'Erreur serveur' })
    };
  }
};
