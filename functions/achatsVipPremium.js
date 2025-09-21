// functions/achatsVipPremium.js
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
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, message: "Méthode non autorisée" })
      };
    }

    const { uid, planName, montant, gain, gainTotal, duree } = JSON.parse(event.body || "{}");

    if (!uid || !planName || !montant || !gain || !duree) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Champs obligatoires manquants" })
      };
    }

    // Vérification VIP Simple actif
    const userVIPSnap = await db.ref(`users/${uid}/vipPlan`).once("value");
    const userVIP = userVIPSnap.exists() ? userVIPSnap.val() : null;

    if (!userVIP || !userVIP.startsWith("vip-")) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Vous devez avoir un VIP Simple actif pour acheter un VIP Premium." })
      };
    }

    // Vérification du montant VIP Premium
    if (montant < 5000 || montant > 1000000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Le montant du VIP Premium doit être compris entre 5 000 et 1 000 000 F." })
      };
    }

    // Vérification de la durée VIP Premium
    const dureesValides = [10, 15, 20, 25, 30];
    if (!dureesValides.includes(duree)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "La durée du VIP Premium doit être 10, 15, 20, 25 ou 30 jours." })
      };
    }

    // Création de l'enregistrement VIP Premium
    const newVIP = {
      planName,
      montant,
      gain,
      gainTotal,
      duree,
      dateAchat: Date.now(),
      statut: "actif"
    };
    await db.ref(`users/${uid}/vipPremium`).push(newVIP);

    // Mise à jour du solde de l'utilisateur
    const soldeSnap = await db.ref(`users/${uid}/mainBalance`).once("value");
    const nouveauSolde = (soldeSnap.val() || 0) - montant;
    await db.ref(`users/${uid}/mainBalance`).set(nouveauSolde);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `VIP Premium "${planName}" acheté avec succès`,
        nouveauSolde
      })
    };

  } catch (error) {
    console.error("Erreur achat VIP Premium:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
