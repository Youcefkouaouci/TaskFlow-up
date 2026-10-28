"use strict";

const { GroupInvitation } = require("../../src/domain/invitation/GroupInvitation");
const { ValidationException } = require("../../src/domain/errors");

describe("Entité Domaine : GroupInvitation", () => {
  it("crée une invitation valide avec un jeton cryptographique et une date d'expiration par défaut", () => {
    const invite = new GroupInvitation({
      groupId: "group-1",
      invitedBy: "user-1",
      email: "  Sarah.Durand@Ecole.fr  ",
      role: "admin",
    });

    expect(invite.email).toBe("sarah.durand@ecole.fr");
    expect(invite.role).toBe("admin");
    expect(invite.status).toBe("pending");
    expect(typeof invite.token).toBe("string");
    expect(invite.token.length).toBeGreaterThanOrEqual(32);
    expect(invite.expiresAt).toBeInstanceOf(Date);
    expect(invite.isExpired()).toBe(false);
    expect(invite.canBeAccepted()).toBe(true);
  });

  it("détecte correctement une invitation expirée", () => {
    const pastDate = new Date(Date.now() - 3600 * 1000);
    const invite = new GroupInvitation({
      groupId: "group-1",
      invitedBy: "user-1",
      email: "test@example.com",
      expiresAt: pastDate,
    });

    expect(invite.isExpired()).toBe(true);
    expect(invite.canBeAccepted()).toBe(false);
  });

  it("refuse un email invalide ou un rôle non autorisé", () => {
    expect(
      () =>
        new GroupInvitation({
          groupId: "group-1",
          invitedBy: "user-1",
          email: "email-invalide",
        })
    ).toThrow(ValidationException);

    expect(
      () =>
        new GroupInvitation({
          groupId: "group-1",
          invitedBy: "user-1",
          email: "valid@example.com",
          role: "owner",
        })
    ).toThrow(ValidationException);
  });
});
