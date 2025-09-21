// index.js - MUBARAKA API pour Vercel (CommonJS)
const express = require("express");
const bodyParser = require("body-parser");

// Import des fonctions originales (CommonJS)
const register = require("./Functions/register.js");
const achatsVipPremium = require("./Functions/achatsVipPremium.js");
const HA_VIP_Achat = require("./Functions/HA-VIP-Achat.js");
const HA_VIP_Verser = require("./Functions/HA-VIP-Verser.js");
const retrait = require("./Functions/retrait.js");
const verserGainPremium = require("./Functions/verserGainPremium.js");

const app = express();
app.use(bodyParser.json());

// ------------------- Helper -------------------
const handleRequest = (fn) => async (req, res) => {
  try {
    const result = await fn.handler({
      httpMethod: req.method,
      body: JSON.stringify(req.body),
      queryStringParameters: req.query
    });
    res.status(result.statusCode ?? 200).json(result.body ? JSON.parse(result.body) : result);
  } catch (err) {
    console.error("Erreur API:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- ROUTES -------------------
// Inscription utilisateur
app.post("/register", handleRequest(register));

// Achat VIP Premium
app.post("/achatsVipPremium", handleRequest(achatsVipPremium));

// Achat VIP simple
app.post("/HA-VIP-Achat", handleRequest(HA_VIP_Achat));

// Versement quotidien VIP simple
app.post("/HA-VIP-Verser", handleRequest(HA_VIP_Verser));

// Retrait utilisateur
app.post("/retrait", handleRequest(retrait));

// Versement VIP Premium (fin de cycle)
app.post("/versementVipPremium", handleRequest(verserGainPremium));

// Endpoint pour déclencher les versements quotidiens VIP simple via Cron externe
app.post("/versementVipQuotidien", async (req, res) => {
  try {
    const result = await HA_VIP_Verser.handler({
      httpMethod: "POST",
      body: JSON.stringify({ cronTrigger: true }),
      queryStringParameters: {}
    });
    res.json({ success: true, message: "Versement quotidien déclenché", data: JSON.parse(result.body) });
  } catch (err) {
    console.error("Erreur versement quotidien:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------- DEMARRAGE SERVEUR LOCAL -------------------
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Serveur MUBARAKA API démarré sur http://localhost:${port}`);
  });
}

// ------------------- EXPORT POUR VERCEL -------------------
module.exports = app;