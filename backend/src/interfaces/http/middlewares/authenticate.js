const jwt = require("jsonwebtoken");
const env = require("../../../infrastructure/config/env");

function authenticate(request, response, next) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Token manquant" });
  }

  const token = authHeader.slice(7);

  try {
    const decodedToken = jwt.verify(token, env.jwtSecret);
    request.user = { id: decodedToken.sub };
    next();
  } catch {
    return response.status(401).json({ error: "Token invalide ou expiré" });
  }
}

module.exports = authenticate;
