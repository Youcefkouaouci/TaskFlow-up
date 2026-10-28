const jwt = require("jsonwebtoken");
const User = require("../../../domain/identity/User");
const env = require("../../../infrastructure/config/env");

async function register(request, response) {
  const { email, password, name, avatarUrl } = request.body;

  if (!email || !password) {
    return response
      .status(400)
      .json({
        error: {
          code: "INVALID_INPUT",
          message: "Email et mot de passe requis",
        },
      });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return response
      .status(409)
      .json({
        error: { code: "EMAIL_ALREADY_USED", message: "Email déjà utilisé" },
      });
  }

  const user = await User.create({
    email,
    password,
    name: name || email.split("@")[0],
    avatarUrl: avatarUrl || null,
  });
  const token = jwt.sign({ sub: user._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return response.status(201).json({
    user: { id: user._id.toString(), email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    token,
  });
}

async function login(request, response) {
  const { email, password } = request.body;

  if (!email || !password) {
    return response
      .status(400)
      .json({
        error: {
          code: "INVALID_INPUT",
          message: "Email et mot de passe requis",
        },
      });
  }

  // select("+password") nécessaire car le champ est select:false dans le schéma
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );
  if (!user || !(await user.comparePassword(password))) {
    return response
      .status(401)
      .json({
        error: { code: "UNAUTHORIZED", message: "Identifiants invalides" },
      });
  }

  const token = jwt.sign({ sub: user._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return response.status(200).json({
    user: { id: user._id.toString(), email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    token,
  });
}

module.exports = { register, login };
