if (process.env.NODE_ENV !== "test") {
  require("dotenv").config();
}

const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(
    `Variables d'environnement manquantes : ${missing.join(", ")}`,
  );
}

const appName = process.env.APP_NAME || "TaskFlow";

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  appName,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  mail: {
    mailer: process.env.MAIL_MAILER || "smtp",
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 465,
    username: process.env.MAIL_USERNAME || "",
    password: (process.env.MAIL_PASSWORD || "").trim(),
    encryption: process.env.MAIL_ENCRYPTION || "ssl",
    fromAddress:
      process.env.MAIL_FROM_ADDRESS ||
      process.env.MAIL_USERNAME ||
      "no-reply@taskflow.local",
    fromName:
      process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_NAME !== "${APP_NAME}"
        ? process.env.MAIL_FROM_NAME
        : appName,
  },
};
