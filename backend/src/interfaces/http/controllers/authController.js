const jwt = require("jsonwebtoken");
const User = require("../../../domain/identity/User");
const env = require("../../../infrastructure/config/env");

async function register(request, response) {
  const { email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({ error: "Email et mot de passe requis" });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return response.status(409).json({ error: "Email déjà utilisé" });
  }

  const user = await User.create({ email, password });
  const token = jwt.sign({ sub: user._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return response.status(201).json({ token, userId: user._id });
}

async function login(request, response) {
  const { email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({ error: "Email et mot de passe requis" });
  }

  // select("+password") nécessaire car le champ est select:false dans le schéma
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return response.status(401).json({ error: "Identifiants invalides" });
  }

  const token = jwt.sign({ sub: user._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return response.status(200).json({ token, userId: user._id });
}

module.exports = { register, login };
