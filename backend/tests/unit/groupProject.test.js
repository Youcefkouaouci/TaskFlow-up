"use strict";

const { Group } = require("../../src/domain/group/Group");
const { Project } = require("../../src/domain/project/Project");
const { ValidationException } = require("../../src/domain/errors");

describe("Entités Domaine : Group & Project", () => {
  describe("Group", () => {
    it("crée un groupe valide et inclut automatiquement ownerId dans members", () => {
      const group = new Group({
        name: "  Équipe TechCorp  ",
        ownerId: "user-1",
      });

      expect(group.name).toBe("Équipe TechCorp");
      expect(group.ownerId).toBe("user-1");
      expect(group.isOwner("user-1")).toBe(true);
      expect(group.canManageGroup("user-1")).toBe(true);
      expect(group.canCreateProject("user-1")).toBe(true);
    });

    it("refuse un nom de groupe vide ou trop long", () => {
      expect(() => new Group({ name: "   ", ownerId: "user-1" })).toThrow(
        ValidationException
      );
      expect(
        () => new Group({ name: "a".repeat(101), ownerId: "user-1" })
      ).toThrow(ValidationException);
    });

    it("applique correctement les droits RBAC (owner, admin, member)", () => {
      const group = new Group({
        name: "Groupe M1",
        ownerId: "u-owner",
        members: [
          { userId: "u-owner", role: "owner" },
          { userId: "u-admin", role: "admin" },
          { userId: "u-member", role: "member" },
        ],
      });

      expect(group.canManageGroup("u-owner")).toBe(true);
      expect(group.canManageGroup("u-admin")).toBe(true);
      expect(group.canManageGroup("u-member")).toBe(false);
      expect(group.canManageGroup("u-outsider")).toBe(false);
      expect(group.isMember("u-member")).toBe(true);
      expect(group.isMember("u-outsider")).toBe(false);
    });
  });

  describe("Project", () => {
    it("crée un projet valide et vérifie les permissions RBAC", () => {
      const project = new Project({
        groupId: "group-1",
        name: "Refonte UI",
        description: "Projet React",
        members: [
          { userId: "u-lead", role: "project_lead" },
          { userId: "u-contrib", role: "contributor" },
          { userId: "u-viewer", role: "viewer" },
        ],
      });

      expect(project.canManageProject("u-lead")).toBe(true);
      expect(project.canManageProject("u-contrib")).toBe(false);
      expect(project.canManageProject("u-viewer")).toBe(false);

      expect(project.canWriteTasks("u-lead")).toBe(true);
      expect(project.canWriteTasks("u-contrib")).toBe(true);
      expect(project.canWriteTasks("u-viewer")).toBe(false);

      expect(project.canView("u-viewer")).toBe(true);
      expect(project.canView("u-outsider")).toBe(false);
    });

    it("refuse un projet sans nom ou sans groupId", () => {
      expect(() => new Project({ name: "Test" })).toThrow(ValidationException);
      expect(() => new Project({ groupId: "g1", name: "" })).toThrow(
        ValidationException
      );
    });
  });
});
