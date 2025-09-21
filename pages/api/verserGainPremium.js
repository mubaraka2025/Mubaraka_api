import * as verserGainPremium from "../../functions/verserGainPremium.js";

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

export default allowCors(async function handler(req, res) {
  try {
    const result = await verserGainPremium.handler({
      httpMethod: req.method,
      body: JSON.stringify(req.body || {}),
      queryStringParameters: req.query,
      headers: req.headers
    });

    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    console.error("Erreur API verserGainPremium:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Erreur serveur API" });
  }
});