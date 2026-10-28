"use strict";

const { Task } = require("../../../src/domain/task/Task");
const { ValidationException } = require("../../../src/domain/errors");

const BASE = { title: "Test task", urgent: false, important: true };

describe("Task entity — T1: validations", () => {
  describe("title", () => {
    it("accepts a valid title", () => {
      expect(() => new Task(BASE)).not.toThrow();
    });

    it("trims surrounding whitespace", () => {
      const task = new Task({ ...BASE, title: "  hello  " });
      expect(task.title).toBe("hello");
    });

    it("rejects empty string", () => {
      expect(() => new Task({ ...BASE, title: "" })).toThrow(
        ValidationException,
      );
    });

    it("rejects whitespace-only title", () => {
      expect(() => new Task({ ...BASE, title: "   " })).toThrow(
        ValidationException,
      );
    });

    it("accepts title of exactly 120 chars", () => {
      expect(() => new Task({ ...BASE, title: "a".repeat(120) })).not.toThrow();
    });

    it("rejects title longer than 120 chars", () => {
      expect(() => new Task({ ...BASE, title: "a".repeat(121) })).toThrow(
        ValidationException,
      );
    });
  });

  describe("status", () => {
    it.each(["todo", "doing", "done"])("accepts status '%s'", (status) => {
      expect(() => new Task({ ...BASE, status })).not.toThrow();
    });

    it("defaults to 'todo'", () => {
      const task = new Task(BASE);
      expect(task.status).toBe("todo");
    });

    it("rejects unknown status", () => {
      expect(() => new Task({ ...BASE, status: "in_progress" })).toThrow(
        ValidationException,
      );
    });

    it("rejects invalid status string", () => {
      expect(() => new Task({ ...BASE, status: "invalid" })).toThrow(
        ValidationException,
      );
    });
  });

  describe("urgent / important", () => {
    it("rejects non-boolean urgent", () => {
      expect(() => new Task({ ...BASE, urgent: "yes" })).toThrow(
        ValidationException,
      );
    });

    it("rejects non-boolean important", () => {
      expect(() => new Task({ ...BASE, important: 1 })).toThrow(
        ValidationException,
      );
    });
  });

  describe("description", () => {
    it("defaults to empty string", () => {
      const task = new Task(BASE);
      expect(task.description).toBe("");
    });

    it("accepts description of exactly 1000 chars", () => {
      expect(
        () => new Task({ ...BASE, description: "a".repeat(1000) }),
      ).not.toThrow();
    });

    it("rejects description longer than 1000 chars", () => {
      expect(
        () => new Task({ ...BASE, description: "a".repeat(1001) }),
      ).toThrow(ValidationException);
    });
  });

  describe("dueDate (date only, YYYY-MM-DD string)", () => {
    it("defaults to null", () => {
      const task = new Task(BASE);
      expect(task.dueDate).toBeNull();
    });

    it("accepts null explicitly", () => {
      expect(() => new Task({ ...BASE, dueDate: null })).not.toThrow();
    });

    it("accepts a valid YYYY-MM-DD string", () => {
      expect(() => new Task({ ...BASE, dueDate: "2026-12-31" })).not.toThrow();
    });

    it("rejects wrong format (DD/MM/YYYY)", () => {
      expect(() => new Task({ ...BASE, dueDate: "31/12/2026" })).toThrow(
        ValidationException,
      );
    });

    it("rejects a non-existent date", () => {
      expect(() => new Task({ ...BASE, dueDate: "2026-02-30" })).toThrow(
        ValidationException,
      );
    });

    it("rejects a non-string dueDate", () => {
      expect(() => new Task({ ...BASE, dueDate: 20261231 })).toThrow(
        ValidationException,
      );
    });
  });
});

describe("Task entity — T2: Eisenhower quadrant", () => {
  it("urgent + important → critical", () => {
    const task = new Task({ ...BASE, urgent: true, important: true });
    expect(task.priority).toBe("critical");
  });

  it("not urgent + important → schedule", () => {
    const task = new Task({ ...BASE, urgent: false, important: true });
    expect(task.priority).toBe("schedule");
  });

  it("urgent + not important → delegate", () => {
    const task = new Task({ ...BASE, urgent: true, important: false });
    expect(task.priority).toBe("delegate");
  });

  it("not urgent + not important → eliminate", () => {
    const task = new Task({ ...BASE, urgent: false, important: false });
    expect(task.priority).toBe("eliminate");
  });
});
