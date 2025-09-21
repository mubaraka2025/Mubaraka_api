// functions/retrait.js
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

    const { uid, nomBene, numeroBene, paysBene, montantBrut, moyenRetrait } = JSON.parse(event.body || "{}");

    if (!uid || !nomBene || !numeroBene || !paysBene || !montantBrut || !moyenRetrait) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Champs obligatoires manquants" }) };
    }

    // Vérifications montant
    if (montantBrut < 2000) return { statusCode: 400, body: JSON.stringify({ success: false, message: "Montant minimum de retrait : 2000 F" }) };
    if (montantBrut > 30000) return { statusCode: 400, body: JSON.stringify({ success: false, message: "Montant maximum de retrait : 30 000 F" }) };

    const fraisRetrait = montantBrut >= 8000 ? Math.floor(montantBrut * 0.15) : 1000;
    const montantNet = montantBrut - fraisRetrait;

    // Vérifier retrait du jour
    const retraitSnap = await db.ref("retraits").orderByChild("userUID").equalTo(uid).once("value");
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const alreadyToday = Object.values(retraitSnap.val() || {}).some(r => r.date >= todayStart.getTime() && r.date <= todayEnd.getTime());
    if (alreadyToday) return { statusCode: 400, body: JSON.stringify({ success: false, message: "Vous ne pouvez effectuer qu'un seul retrait par jour" }) };

    // Vérifier solde utilisateur
    const soldeSnap = await db.ref(`users/${uid}/mainBalance`).once("value");
    let solde = soldeSnap.exists() ? soldeSnap.val() : 0;
    if (solde < montantNet) return { statusCode: 400, body: JSON.stringify({ success: false, message: "Solde insuffisant" }) };

    // Déduire le solde
    await db.ref(`users/${uid}/mainBalance`).set(solde - montantNet);

    // Enregistrer le retrait
    const retraitRef = db.ref("retraits").push();
    await retraitRef.set({
      userUID: uid,
      nomBene,
      numeroBene,
      paysBene,
      montantBrut,
      fraisRetrait,
      montantNet,
      moyen: moyenRetrait,
      date: Date.now(),
      status: "en_attente"
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Retrait enregistré",
        montantBrut,
        fraisRetrait,
        montantNet,
        nouveauSolde: solde - montantNet
      })
    };

  } catch (error) {
    console.error("Erreur retrait:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message }) };
  }
};
