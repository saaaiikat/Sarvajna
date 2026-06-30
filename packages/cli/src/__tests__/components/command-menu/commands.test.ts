import { describe, test, expect, vi } from "vitest";
import type { CommandContext } from "../../../components/command-menu/types";

// Provide a minimal JSX runtime so JSX inside action() functions in commands.tsx
// compiles without needing a real terminal renderer.
vi.mock("@opentui/react/jsx-runtime", () => ({
  jsx: (type: unknown, props: unknown) => ({ type, props }),
  jsxs: (type: unknown, props: unknown) => ({ type, props }),
  Fragment: Symbol("Fragment"),
}));

// Stub the dialogs barrel so ThemeDialogContent is a no-op.
vi.mock("../../../components/dialogs", () => ({
  ThemeDialogContent: () => null,
}));

import { COMMANDS } from "../../../components/command-menu/commands";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    exit: vi.fn(),
    toast: {
      show: vi.fn(),
    },
    dialog: {
      open: vi.fn(),
      close: vi.fn(),
    },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("COMMANDS array", () => {
  test("is a non-empty array", () => {
    expect(Array.isArray(COMMANDS)).toBe(true);
    expect(COMMANDS.length).toBeGreaterThan(0);
  });

  test("every command has a non-empty string name", () => {
    for (const cmd of COMMANDS) {
      expect(typeof cmd.name).toBe("string");
      expect(cmd.name.trim().length).toBeGreaterThan(0);
    }
  });

  test("every command has a non-empty string description", () => {
    for (const cmd of COMMANDS) {
      expect(typeof cmd.description).toBe("string");
      expect(cmd.description.trim().length).toBeGreaterThan(0);
    }
  });

  test("every command value starts with '/'", () => {
    for (const cmd of COMMANDS) {
      expect(cmd.value.startsWith("/")).toBe(true);
    }
  });

  test("every command value matches '/<name>'", () => {
    for (const cmd of COMMANDS) {
      expect(cmd.value).toBe(`/${cmd.name}`);
    }
  });

  test("all command names are unique", () => {
    const names = COMMANDS.map((c) => c.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test("action is either undefined or a function", () => {
    for (const cmd of COMMANDS) {
      const actionType = typeof cmd.action;
      expect(["undefined", "function"].includes(actionType)).toBe(true);
    }
  });

  test("contains expected command names", () => {
    const names = COMMANDS.map((c) => c.name);
    for (const expected of ["new", "agents", "models", "theme", "exit"]) {
      expect(names).toContain(expected);
    }
  });
});

describe("COMMANDS: exit command", () => {
  const exitCmd = COMMANDS.find((c) => c.name === "exit");

  test("exit command exists", () => {
    expect(exitCmd).toBeDefined();
  });

  test("exit command has an action function", () => {
    expect(typeof exitCmd!.action).toBe("function");
  });

  test("exit action calls ctx.exit()", () => {
    const ctx = makeMockContext();
    exitCmd!.action!(ctx);
    expect(ctx.exit).toHaveBeenCalledTimes(1);
  });

  test("exit action does not call ctx.dialog.open()", () => {
    const ctx = makeMockContext();
    exitCmd!.action!(ctx);
    expect(ctx.dialog.open).not.toHaveBeenCalled();
  });
});

describe("COMMANDS: agents command", () => {
  const agentsCmd = COMMANDS.find((c) => c.name === "agents");

  test("agents command exists", () => {
    expect(agentsCmd).toBeDefined();
  });

  test("agents command has an action function", () => {
    expect(typeof agentsCmd!.action).toBe("function");
  });

  test("agents action calls ctx.dialog.open() with a title", () => {
    const ctx = makeMockContext();
    agentsCmd!.action!(ctx);
    expect(ctx.dialog.open).toHaveBeenCalledTimes(1);
    const callArgs = (ctx.dialog.open as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const config = callArgs[0] as { title: string };
    expect(typeof config.title).toBe("string");
    expect(config.title.length).toBeGreaterThan(0);
  });

  test("agents action does not call ctx.exit()", () => {
    const ctx = makeMockContext();
    agentsCmd!.action!(ctx);
    expect(ctx.exit).not.toHaveBeenCalled();
  });
});

describe("COMMANDS: theme command", () => {
  const themeCmd = COMMANDS.find((c) => c.name === "theme");

  test("theme command exists", () => {
    expect(themeCmd).toBeDefined();
  });

  test("theme command has an action function", () => {
    expect(typeof themeCmd!.action).toBe("function");
  });

  test("theme action calls ctx.dialog.open() with 'Select Theme' title", () => {
    const ctx = makeMockContext();
    themeCmd!.action!(ctx);
    expect(ctx.dialog.open).toHaveBeenCalledTimes(1);
    const callArgs = (ctx.dialog.open as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const config = callArgs[0] as { title: string };
    expect(config.title).toBe("Select Theme");
  });

  test("theme action does not call ctx.exit()", () => {
    const ctx = makeMockContext();
    themeCmd!.action!(ctx);
    expect(ctx.exit).not.toHaveBeenCalled();
  });
});

describe("COMMANDS: commands without actions", () => {
  const commandsWithoutAction = [
    "new", "models", "sessions", "login", "logout", "upgrade", "usage",
  ];

  for (const name of commandsWithoutAction) {
    test(`${name} command has no action (falls back to value insertion)`, () => {
      const cmd = COMMANDS.find((c) => c.name === name);
      expect(cmd).toBeDefined();
      expect(cmd!.action).toBeUndefined();
    });
  }
});