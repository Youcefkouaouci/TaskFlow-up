"use strict";

const nodemailer = require("nodemailer");
const env = require("../config/env");

const STATUS_LABEL = { todo: "À faire", doing: "En cours", done: "Terminé" };
const PRIORITY_LABEL = {
  critical: "Critique (urgent + important)",
  schedule: "À planifier (important)",
  delegate: "À déléguer (urgent)",
  eliminate: "À éliminer",
};

function buildTaskShareEmail(to, task) {
  const priority = PRIORITY_LABEL[task.priority] ?? task.priority;
  const status = STATUS_LABEL[task.status] ?? task.status;
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  const subject = `[TaskFlow] Tâche partagée avec vous : "${task.title}"`;

  const rows = [
    ["Titre", task.title],
    ["Statut", status],
    ["Priorité", priority],
    task.description ? ["Description", task.description] : null,
    dueDate ? ["Échéance", dueDate] : null,
  ]
    .filter(Boolean)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#555;white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:8px 12px;color:#111">${value}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;color:#111">
      <h2 style="margin-top:0;font-size:20px">TaskFlow — Tâche partagée</h2>
      <p style="font-size:14px;color:#333;line-height:1.6">
        Une tâche a été partagée avec vous.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;background:#f9f9f9;border-radius:8px;overflow:hidden">
        ${rows}
      </table>
      <p style="font-size:12px;color:#888;margin-top:24px">
        Connectez-vous à TaskFlow pour consulter cette tâche.
      </p>
    </div>`;

  return { subject, html };
}

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

  async sendTaskShareEmail({ to, task }) {
    const { subject, html } = buildTaskShareEmail(to, task);
    const record = { to, taskId: task.id, subject, html, sentAt: new Date() };

    const transporter = this.getTransporter();
    if (!transporter) {
      this.sentEmails.push({ ...record, simulated: true });
      return { sent: true, simulated: true, subject };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${env.mail.fromName}" <${env.mail.fromAddress}>`,
        to,
        subject,
        html,
      });
      this.sentEmails.push({
        ...record,
        simulated: false,
        messageId: info.messageId,
      });
      return { sent: true, simulated: false, messageId: info.messageId, subject };
    } catch (err) {
      console.warn("[EmailService] Échec SMTP task share, fallback log local :", err.message);
      this.sentEmails.push({ ...record, simulated: true, error: err.message });
      return { sent: false, simulated: true, error: err.message, subject };
    }
  }
}

module.exports = new EmailService();
