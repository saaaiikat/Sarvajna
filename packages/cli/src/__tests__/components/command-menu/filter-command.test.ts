import { describe, test, expect, vi } from "vitest";

// Mock the commands module so we control the COMMANDS array and avoid pulling
// in JSX/terminal dependencies at test time. vi.mock() is hoisted by vitest
// so this runs before any imports below.
vi.mock("../../../components/command-menu/commands", () => ({
  COMMANDS: [
    { name: "new", description: "Start a new conversation", value: "/new" },
    { name: "agents", description: "Switch agents", value: "/agents" },
    { name: "models", description: "Select AI model", value: "/models" },
    { name: "sessions", description: "Browse past sessions", value: "/sessions" },
    { name: "theme", description: "Change color theme", value: "/theme" },
    { name: "login", description: "Sign in", value: "/login" },
    { name: "logout", description: "Sign out", value: "/logout" },
    { name: "upgrade", description: "Buy more credits", value: "/upgrade" },
    { name: "usage", description: "Open billing portal", value: "/usage" },
    { name: "exit", description: "Quit the application", value: "/exit" },
  ],
}));

import { getFilteredCommands } from "../../../components/command-menu/filter-command";

const ALL_COMMAND_NAMES = [
  "new", "agents", "models", "sessions", "theme",
  "login", "logout", "upgrade", "usage", "exit",
];

describe("getFilteredCommands", () => {
  describe("empty query", () => {
    test("returns all commands when query is empty string", () => {
      const result = getFilteredCommands("");
      expect(result).toHaveLength(ALL_COMMAND_NAMES.length);
    });

    test("returned commands have the correct names when query is empty", () => {
      const result = getFilteredCommands("");
      const names = result.map((c) => c.name);
      expect(names).toContain("theme");
      expect(names).toContain("exit");
      expect(names).toContain("new");
    });
  });

  describe("prefix filtering", () => {
    test("filters commands by exact name prefix", () => {
      const result = getFilteredCommands("th");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("theme");
    });

    test("returns exact match when full name is given", () => {
      const result = getFilteredCommands("theme");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("theme");
    });

    test("returns multiple matches when prefix matches several commands", () => {
      // "lo" matches "login" and "logout"
      const result = getFilteredCommands("lo");
      expect(result).toHaveLength(2);
      const names = result.map((c) => c.name);
      expect(names).toContain("login");
      expect(names).toContain("logout");
    });

    test("returns single match for unique prefix", () => {
      // "ex" only matches "exit"
      const result = getFilteredCommands("ex");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("exit");
    });

    test("returns empty array when no command matches the prefix", () => {
      const result = getFilteredCommands("zzz");
      expect(result).toHaveLength(0);
    });

    test("does not match commands whose name contains but does not start with the query", () => {
      // "ession" is contained in "sessions" but does not start with it
      const result = getFilteredCommands("ession");
      expect(result).toHaveLength(0);
    });
  });

  describe("case insensitivity", () => {
    test("matches uppercase query against lowercase command names", () => {
      const result = getFilteredCommands("TH");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("theme");
    });

    test("matches mixed-case query", () => {
      const result = getFilteredCommands("ThEmE");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("theme");
    });

    test("all-uppercase single letter matches expected commands", () => {
      // "M" should match "models"
      const result = getFilteredCommands("M");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("models");
    });
  });

  describe("single character queries", () => {
    test("'n' matches only 'new'", () => {
      const result = getFilteredCommands("n");
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("new");
    });

    test("'u' matches 'upgrade' and 'usage'", () => {
      const result = getFilteredCommands("u");
      const names = result.map((c) => c.name);
      expect(names).toContain("upgrade");
      expect(names).toContain("usage");
    });

    test("'s' matches 'sessions'", () => {
      const result = getFilteredCommands("s");
      const names = result.map((c) => c.name);
      expect(names).toContain("sessions");
    });
  });

  describe("result shape", () => {
    test("each returned command has name, description, and value", () => {
      const results = getFilteredCommands("");
      for (const cmd of results) {
        expect(typeof cmd.name).toBe("string");
        expect(typeof cmd.description).toBe("string");
        expect(typeof cmd.value).toBe("string");
      }
    });

    test("returned value starts with '/' for all commands", () => {
      const results = getFilteredCommands("");
      for (const cmd of results) {
        expect(cmd.value.startsWith("/")).toBe(true);
      }
    });

    test("filtered result preserves original command objects (reference check via name)", () => {
      const result = getFilteredCommands("theme");
      expect(result[0]!.name).toBe("theme");
      expect(result[0]!.value).toBe("/theme");
      expect(result[0]!.description).toBe("Change color theme");
    });
  });

  describe("boundary cases", () => {
    test("whitespace-only query returns no results (does not match any prefix)", () => {
      // A query of " " won't match any command name starting with a space
      const result = getFilteredCommands(" ");
      expect(result).toHaveLength(0);
    });

    test("very long query with no match returns empty array", () => {
      const result = getFilteredCommands("thisiswaytoolong");
      expect(result).toHaveLength(0);
    });

    test("full exact match for 'exit' returns the exit command", () => {
      const result = getFilteredCommands("exit");
      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe("/exit");
    });
  });
});