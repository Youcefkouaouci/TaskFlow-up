"use strict";

const nodemailer = require("nodemailer");
const env = require("../config/env");

class EmailService {
  constructor() {
    this.sentEmails = [];
    this.transporter = null;
  }

  getTransporter() {
    if (this.transporter) return this.transporter;

    if (
      process.env.NODE_ENV === "test" ||
      !env.mail.username ||
      !env.mail.password
    ) {
      return null;
    }

    const isSecure =
      env.mail.encryption === "ssl" || Number(env.mail.port) === 465;

    this.transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: isSecure,
      auth: {
        user: env.mail.username,
        pass: env.mail.password,
      },
    });

    return this.transporter;
  }

  async sendGroupInvitationEmail({
    to,
    groupName,
    inviterName,
    role,
    token,
    expiresAt,
  }) {
    const inviteUrl = `${env.frontendUrl}/invitations/accept?token=${token}`;
    const subject = `[${env.appName}] Invitation à rejoindre le groupe « ${groupName} »`;
    const formattedDate = new Date(expiresAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; color: #111111;">
        <h2 style="margin-top: 0; font-size: 20px;">${env.appName} — Invitation de groupe</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #333333;">
          Bonjour,<br/><br/>
          <strong>${inviterName || "Un administrateur"}</strong> vous invite à rejoindre l'espace de travail <strong>${groupName}</strong> avec le rôle <strong>${role}</strong>.
        </p>
        <div style="margin: 24px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #111111; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Rejoindre le groupe
          </a>
        </div>
        <p style="font-size: 12px; color: #666666;">
          Lien direct : <a href="${inviteUrl}" style="color: #111111;">${inviteUrl}</a><br/>
          Cette invitation expire le <strong>${formattedDate}</strong>.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"${env.mail.fromName}" <${env.mail.fromAddress}>`,
      to,
      subject,
      html,
    };

    const record = {
      to,
      subject,
      inviteUrl,
      token,
      groupName,
      role,
      expiresAt,
      sentAt: new Date(),
    };

    const transporter = this.getTransporter();
    if (!transporter) {
      this.sentEmails.push({ ...record, simulated: true });
      return { sent: true, simulated: true, inviteUrl };
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      this.sentEmails.push({
        ...record,
        simulated: false,
        messageId: info.messageId,
      });
      return { sent: true, simulated: false, messageId: info.messageId, inviteUrl };
    } catch (err) {
      console.warn("[EmailService] Échec SMTP, fallback log local :", err.message);
      this.sentEmails.push({ ...record, simulated: true, error: err.message });
      return { sent: false, simulated: true, error: err.message, inviteUrl };
    }
  }

  async sendPasswordResetEmail({ to, userName, token, expiresAt }) {
    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
    const subject = `[${env.appName}] Réinitialisation de votre mot de passe`;
    const formattedTime = new Date(expiresAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; color: #111111;">
        <h2 style="margin-top: 0; font-size: 20px;">${env.appName} — Mot de passe oublié</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #333333;">
          Bonjour <strong>${userName || to}</strong>,<br/><br/>
          Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte TaskFlow.
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
        </p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #E5484D; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="font-size: 12px; color: #666666;">
          Lien direct : <a href="${resetUrl}" style="color: #111111;">${resetUrl}</a><br/>
          Ce lien est valable pendant <strong>15 minutes</strong> (jusqu'à ${formattedTime}). Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"${env.mail.fromName}" <${env.mail.fromAddress}>`,
      to,
      subject,
      html,
    };

    const record = {
      type: "password_reset",
      to,
      subject,
      resetUrl,
      token,
      expiresAt,
      sentAt: new Date(),
    };

    const transporter = this.getTransporter();
    if (!transporter) {
      this.sentEmails.push({ ...record, simulated: true });
      return { sent: true, simulated: true, resetUrl };
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      this.sentEmails.push({
        ...record,
        simulated: false,
        messageId: info.messageId,
      });
      return {
        sent: true,
        simulated: false,
        messageId: info.messageId,
        resetUrl,
      };
    } catch (err) {
      console.warn(
        "[EmailService] Échec SMTP (reset password), fallback log local :",
        err.message
      );
      this.sentEmails.push({ ...record, simulated: true, error: err.message });
      return { sent: false, simulated: true, error: err.message, resetUrl };
    }
  }
}

module.exports = new EmailService();
