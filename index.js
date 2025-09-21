import * as HA_VIP_Achat from "./functions/HA-VIP-Achat.js";
import * as HA_VIP_Verser from "./functions/HA-VIP-Verser.js";
import * as register from "./functions/register.js";
import * as retrait from "./functions/retrait.js";
import * as verserGainPremium from "./functions/verserGainPremium.js";
import * as achatsVipPremium from "./functions/achatsVipPremium.js";

// Middleware pour gérer le CORS
const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// Wrapper centralisé
export default allowCors(async function handler(req, res) {
  const url = req.url.toLowerCase();

  try {
    if (url.includes("/ha_vip_achat")) {
      const result = await HA_VIP_Achat.handler({
        httpMethod: req.method,
        body: JSON.stringify(req.body || {}),
        headers: req.headers,
        queryStringParameters: req.query,
      });
      res.status(result.statusCode).json(JSON.parse(result.body));
      return;
    }

    if (url.includes("/ha_vip_verser")) {
      const result = await HA_VIP_Verser.handler({
        httpMethod: req.method,
        body: JSON.stringify(req.body || {}),
        headers: req.headers,
        queryStringParameters: req.query,
      });
      res.status(result.statusCode).json(JSON.parse(result.body));
      return;
    }

    if (url.includes("/register")) {
      const result = await register.handler({
        httpMethod: req.method,
        body: JSON.stringify(req.body || {}),
        headers: req.headers,
        queryStringParameters: req.query,
      });
      res.status(result.statusCode).json(JSON.parse(result.body));
      return;
    }

    if (url.includes("/retrait")) {
      const result = await retrait.handler({
        httpMethod: req.method,
        body: JSON.stringify(req.body || {}),
        headers: req.headers,
        queryStringParameters: req.query,
      });
      res.status(result.statusCode).json(JSON.parse(result.body));
      return;
    }

    if (url.includes("/versergainpremium")) {
      const result = await verserGainPremium.handler({
        httpMethod: req.method,
        body: JSON.stringify(req.body || {}),
        headers: req.headers,
        queryStringParameters: req.query,
      });
      res.status(result.statusCode).json(JSON.parse(result.body));
      return;
    }

    if (url.includes("/achatsvippremium")) {
      const result = await achatsVipPremium.handler({
        httpMethod: req.method,
        body: JSON.stringify(req.body || {}),
        headers: req.headers,
        queryStringParameters: req.query,
      });
      res.status(result.statusCode).json(JSON.parse(result.body));
      return;
    }

    // Si aucune route ne correspond
    res.status(404).json({ success: false, message: "API non trouvée" });
  } catch (err) {
    console.error("Erreur API :", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur API" });
  }
});
