// functions/HA-VIP-Achat.js  
const admin = require("firebase-admin");  

// Initialisation Firebase si pas déjà fait  
if (!admin.apps.length) {  
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {  
    throw new Error("La variable d'environnement FIREBASE_SERVICE_ACCOUNT n’est pas définie !");  
  }  

  let serviceAccount;  
  try {  
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);  
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

    // 🔐 Récupération et vérification du token Firebase depuis les headers  
    const authHeader = event.headers?.Authorization || event.headers?.authorization;  
    if (!authHeader || !authHeader.startsWith("Bearer ")) {  
      return { statusCode: 401, body: JSON.stringify({ success: false, message: "Token manquant" }) };  
    }  

    const idToken = authHeader.split("Bearer ")[1];  
    let decodedToken;  
    try {  
      decodedToken = await admin.auth().verifyIdToken(idToken);  
    } catch {  
      return { statusCode: 401, body: JSON.stringify({ success: false, message: "Token invalide" }) };  
    }  

    const userUID = decodedToken.uid;  

    // Récupérer les autres paramètres depuis le corps  
    const { vipKey, planName, montant, revenuQuotidien, duree } = JSON.parse(event.body || "{}");  

    if (!vipKey || !planName || !montant || !revenuQuotidien || !duree) {  
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Paramètres manquants" }) };  
    }  

    if (montant <= 0 || revenuQuotidien <= 0 || duree <= 0) {  
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Valeurs invalides" }) };  
    }  

    // Vérifier si c'est le premier achat VIP du filleul  
    const vipSnap = await db.ref("achatsVip").orderByChild("userUID").equalTo(userUID).once("value");  
    const premierAchat = !vipSnap.exists();  

    // Enregistrer le VIP acheté  
    await db.ref(`achatsVip/${vipKey}`).set({  
      userUID,  
      planName,  
      montant,  
      revenuQuotidien,  
      duree,  
      status: "actif",  
      date: Date.now(),  
      dernierVersement: 0  
    });  

    // Bonus parrainage sur le premier achat uniquement  
    if (premierAchat) {  
      const bonusNiveaux = [0.20, 0.03, 0.02]; // 20%, 3%, 2%  
      let currentUID = userUID;  

      for (let i = 0; i < bonusNiveaux.length; i++) {  
        const userSnap = await db.ref(`users/${currentUID}`).once("value");  
        const userData = userSnap.val();  

        if (!userData || !userData.codeParrainage) break;  

        const parrainSnap = await db.ref("users").orderByChild("referralCode").equalTo(userData.codeParrainage).once("value");  
        const parrainData = parrainSnap.val();  
        if (!parrainData) break;  

        const parrainUID = Object.keys(parrainData)[0];  
        const bonus = Math.floor(montant * bonusNiveaux[i]);  

        await db.ref(`users/${parrainUID}/mainBalance`).transaction(balance => (balance || 0) + bonus);  

        currentUID = parrainUID;  
      }  
    }  

    // Mettre à jour l'utilisateur avec le VIP actif  
    await db.ref(`users/${userUID}/vipPlan`).set(planName);  
    await db.ref(`users/${userUID}/vipActive`).set(true);  

    return {  
      statusCode: 200,  
      body: JSON.stringify({ success: true, message: `VIP simple "${planName}" acheté avec succès !`, premierAchat })  
    };  

  } catch (err) {  
    console.error("Erreur HA-VIP-Achat:", err);  
    return {  
      statusCode: 500,  
      body: JSON.stringify({ success: false, message: err.message || "Erreur serveur" })  
    };  
  }  
};
