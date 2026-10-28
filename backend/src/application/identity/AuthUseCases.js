"use strict";

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  ValidationException,
  UnauthorizedException,
  ConflictException,
} = require("../../domain/errors");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const env = require("../../infrastructure/config/env");
const emailService = require("../../infrastructure/email/EmailService");

class AuthUseCases {
  formatAuthResponse(userDoc, token) {
    const userId = userDoc._id.toString();
    return {
      user: {
        id: userId,
        email: userDoc.email,
        name: userDoc.name,
        avatarUrl: userDoc.avatarUrl,
      },
      token,
      userId,
      name: userDoc.name,
      avatarUrl: userDoc.avatarUrl,
    };
  }

  signToken(userId) {
    return jwt.sign({ sub: userId }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
  }

  async register(payload = {}) {
    const { email, password, name, avatarUrl } = payload;

    if (!email || !password) {
      throw new ValidationException("Email et mot de passe requis");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await UserModel.findOne({ email: normalizedEmail });
    if (exists) {
      throw new ConflictException("Email déjà utilisé", "EMAIL_ALREADY_USED");
    }

    const user = await UserModel.create({
      email: normalizedEmail,
      password,
      name: name || normalizedEmail.split("@")[0],
      avatarUrl: avatarUrl || null,
    });

    const token = this.signToken(user._id);
    return this.formatAuthResponse(user, token);
  }

  async login(payload = {}) {
    const { email, password } = payload;

    if (!email || !password) {
      throw new ValidationException("Email et mot de passe requis");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const token = this.signToken(user._id);
    return this.formatAuthResponse(user, token);
  }

  async forgotPassword(payload = {}) {
    const { email } = payload;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationException("Une adresse e-mail valide est requise");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });

    const genericMessage =
      "Si un compte est associé à cette adresse e-mail, un lien de réinitialisation a été envoyé.";

    if (!user) {
      return {
        message: genericMessage,
        emailSent: false,
      };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();

    const mailResult = await emailService.sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      token: rawToken,
      expiresAt,
    });

    return {
      message: genericMessage,
      emailSent: mailResult.sent,
      resetUrl: mailResult.resetUrl,
    };
  }

  async resetPassword(payload = {}) {
    const { token, password } = payload;

    if (!token || typeof token !== "string" || !token.trim()) {
      throw new ValidationException("Le jeton de réinitialisation est requis");
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      throw new ValidationException(
        "Le nouveau mot de passe doit contenir au moins 6 caractères"
      );
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select("+password +resetPasswordToken +resetPasswordExpiresAt");

    if (!user) {
      throw new ValidationException(
        "Le lien de réinitialisation est invalide ou a expiré",
        "INVALID_OR_EXPIRED_TOKEN"
      );
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    const jwtToken = this.signToken(user._id);
    return {
      message: "Votre mot de passe a été réinitialisé avec succès",
      ...this.formatAuthResponse(user, jwtToken),
    };
  }

  async getProfile(userId) {
    if (!userId) {
      throw new UnauthorizedException("Non authentifié");
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Utilisateur introuvable");
    }
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async updateProfile(userId, payload = {}) {
    if (!userId) {
      throw new UnauthorizedException("Non authentifié");
    }

    const user = await UserModel.findById(userId).select("+password");
    if (!user) {
      throw new UnauthorizedException("Utilisateur introuvable");
    }

    const { name, avatarUrl, currentPassword, newPassword } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2) {
        throw new ValidationException(
          "Le nom doit contenir au moins 2 caractères"
        );
      }
      user.name = trimmedName;
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
    }

    if (newPassword !== undefined && String(newPassword).length > 0) {
      if (!currentPassword) {
        throw new ValidationException(
          "Veuillez renseigner votre mot de passe actuel pour pouvoir le modifier"
        );
      }
      const isCurrentValid = await user.comparePassword(String(currentPassword));
      if (!isCurrentValid) {
        throw new ValidationException(
          "Le mot de passe actuel est incorrect",
          "INVALID_CURRENT_PASSWORD"
        );
      }
      if (String(newPassword).length < 6) {
        throw new ValidationException(
          "Le nouveau mot de passe doit contenir au moins 6 caractères"
        );
      }
      user.password = String(newPassword);
    }

    await user.save();

    const token = this.signToken(user._id);
    return {
      message: "Profil mis à jour avec succès",
      ...this.formatAuthResponse(user, token),
    };
  }
}

module.exports = new AuthUseCases();
