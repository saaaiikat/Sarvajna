import { describe, test, expect, vi } from "vitest";

// Stub terminal/React-renderer dependencies so we can import the module without
// a live terminal session. vi.mock() is hoisted by vitest.
vi.mock("@opentui/react", () => ({
  useRenderer: () => ({ destroy: vi.fn() }),
  useKeyboard: vi.fn(),
  useTerminalDimensions: () => ({ width: 80, height: 24 }),
}));

vi.mock("@opentui/core", () => ({
  TextAttributes: { DIM: 1, BOLD: 2 },
  RGBA: { fromInts: () => "rgba(0,0,0,150)" },
}));

vi.mock("../../components/Emptyborder", () => ({
  EmptyBorder: {},
  SplitBorderChars: {},
}));

vi.mock("../../providers/toast", () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock("../../providers/dialog", () => ({
  useDialog: () => ({ open: vi.fn(), close: vi.fn() }),
}));

vi.mock("../../providers/theme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#56D6C2",
      surface: "#1A1A24",
      selection: "#89B4FA",
      background: "#0D0D12",
      dialogSurface: "#0A0A10",
      success: "#82E0AA",
      error: "#E74C5E",
      info: "#56D6C2",
      planMode: "#CF8EF4",
      thinking: "#CF8EF4",
      thinkingBorder: "#34344A",
      dimSeparator: "#4E4E66",
    },
    currentTheme: { name: "Nightfox", colors: {} },
    setTheme: vi.fn(),
  }),
}));

vi.mock("../../providers/keyboard-layer", () => ({
  useKeyboardLayer: () => ({
    push: vi.fn(),
    pop: vi.fn(),
    isTopLayer: () => true,
    setResponder: vi.fn(),
  }),
}));

vi.mock("../../components/command-menu/use-command-menu", () => ({
  useCommandMenu: () => ({
    showCommandMenu: false,
    commandQuery: "",
    selectedIndex: 0,
    scrollRef: { current: null },
    handleContentChange: vi.fn(),
    resolveCommand: () => undefined,
    setSelectedIndex: vi.fn(),
  }),
}));

vi.mock("../../components/search-bar", () => ({
  SearchBar: () => null,
}));

vi.mock("../../components/command-menu", () => ({
  CommandMenu: () => null,
}));

import { TEXTAREA_KEY_BINDINGS } from "../../components/input-bar";

describe("TEXTAREA_KEY_BINDINGS", () => {
  test("is an array", () => {
    expect(Array.isArray(TEXTAREA_KEY_BINDINGS)).toBe(true);
  });

  test("has exactly 4 bindings", () => {
    expect(TEXTAREA_KEY_BINDINGS).toHaveLength(4);
  });

  test("first binding submits on Return", () => {
    const binding = TEXTAREA_KEY_BINDINGS[0]!;
    expect(binding.name).toBe("return");
    expect(binding.action).toBe("submit");
    expect(binding.shift).toBeFalsy();
  });

  test("second binding submits on Enter", () => {
    const binding = TEXTAREA_KEY_BINDINGS[1]!;
    expect(binding.name).toBe("enter");
    expect(binding.action).toBe("submit");
    expect(binding.shift).toBeFalsy();
  });

  test("third binding inserts newline on Shift+Return", () => {
    const binding = TEXTAREA_KEY_BINDINGS[2]!;
    expect(binding.name).toBe("return");
    expect(binding.shift).toBe(true);
    expect(binding.action).toBe("newline");
  });

  test("fourth binding inserts newline on Shift+Enter", () => {
    const binding = TEXTAREA_KEY_BINDINGS[3]!;
    expect(binding.name).toBe("enter");
    expect(binding.shift).toBe(true);
    expect(binding.action).toBe("newline");
  });

  test("all bindings have name and action fields", () => {
    for (const binding of TEXTAREA_KEY_BINDINGS) {
      expect(typeof binding.name).toBe("string");
      expect(typeof binding.action).toBe("string");
    }
  });

  test("submit bindings do not have shift set to true", () => {
    const submitBindings = TEXTAREA_KEY_BINDINGS.filter((b) => b.action === "submit");
    for (const binding of submitBindings) {
      expect(binding.shift).not.toBe(true);
    }
  });

  test("newline bindings both have shift: true", () => {
    const newlineBindings = TEXTAREA_KEY_BINDINGS.filter((b) => b.action === "newline");
    expect(newlineBindings).toHaveLength(2);
    for (const binding of newlineBindings) {
      expect(binding.shift).toBe(true);
    }
  });

  test("return and enter both have submit actions", () => {
    const returnSubmit = TEXTAREA_KEY_BINDINGS.find(
      (b) => b.name === "return" && b.action === "submit",
    );
    const enterSubmit = TEXTAREA_KEY_BINDINGS.find(
      (b) => b.name === "enter" && b.action === "submit",
    );
    expect(returnSubmit).toBeDefined();
    expect(enterSubmit).toBeDefined();
  });
});