import { describe, test, expect } from "vitest";
import { THEMES, DEFAULT_THEME } from "../theme";
import type { Theme, ThemeColors } from "../theme";

const REQUIRED_COLOR_KEYS: (keyof ThemeColors)[] = [
  "primary",
  "planMode",
  "selection",
  "thinking",
  "success",
  "error",
  "info",
  "background",
  "surface",
  "dialogSurface",
  "thinkingBorder",
  "dimSeparator",
];

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

describe("THEMES", () => {
  test("exports a non-empty array of themes", () => {
    expect(Array.isArray(THEMES)).toBe(true);
    expect(THEMES.length).toBeGreaterThan(0);
  });

  test("every theme has a non-empty string name", () => {
    for (const theme of THEMES) {
      expect(typeof theme.name).toBe("string");
      expect(theme.name.trim().length).toBeGreaterThan(0);
    }
  });

  test("every theme has all required color keys", () => {
    for (const theme of THEMES) {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(
          theme.colors,
          `Theme "${theme.name}" is missing color key "${key}"`,
        ).toHaveProperty(key);
      }
    }
  });

  test("every color value is a valid 6-digit hex string", () => {
    for (const theme of THEMES) {
      for (const key of REQUIRED_COLOR_KEYS) {
        const value = theme.colors[key];
        expect(
          HEX_COLOR_RE.test(value),
          `Theme "${theme.name}" color "${key}" has invalid value "${value}"`,
        ).toBe(true);
      }
    }
  });

  test("all theme names are unique", () => {
    const names = THEMES.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test("contains a Nightfox theme", () => {
    const nightfox = THEMES.find((t) => t.name === "Nightfox");
    expect(nightfox).toBeDefined();
  });

  test("Nightfox theme has expected primary color", () => {
    const nightfox = THEMES.find((t) => t.name === "Nightfox");
    expect(nightfox?.colors.primary).toBe("#56D6C2");
  });

  test("contains at least 10 themes", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(10);
  });

  test("no theme has empty color values", () => {
    for (const theme of THEMES) {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(
          theme.colors[key].length,
          `Theme "${theme.name}" color "${key}" is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  test("Dracula theme has expected colors", () => {
    const dracula = THEMES.find((t) => t.name === "Dracula");
    expect(dracula).toBeDefined();
    expect(dracula?.colors.primary).toBe("#BD93F9");
    expect(dracula?.colors.background).toBe("#282A36");
    expect(dracula?.colors.error).toBe("#FF5555");
  });
});

describe("DEFAULT_THEME", () => {
  test("is defined and not null", () => {
    expect(DEFAULT_THEME).toBeDefined();
    expect(DEFAULT_THEME).not.toBeNull();
  });

  test("is the Nightfox theme", () => {
    expect(DEFAULT_THEME.name).toBe("Nightfox");
  });

  test("is a member of the THEMES array", () => {
    const found = THEMES.find((t) => t.name === DEFAULT_THEME.name);
    expect(found).toBeDefined();
  });

  test("has all required color properties", () => {
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(DEFAULT_THEME.colors).toHaveProperty(key);
      expect(HEX_COLOR_RE.test(DEFAULT_THEME.colors[key])).toBe(true);
    }
  });

  test("colors object matches the Nightfox entry in THEMES", () => {
    const nightfox = THEMES.find((t) => t.name === "Nightfox")!;
    expect(DEFAULT_THEME.colors).toEqual(nightfox.colors);
  });
});

describe("Theme type structure", () => {
  test("a well-formed theme object satisfies the Theme shape", () => {
    const sampleTheme: Theme = {
      name: "Test Theme",
      colors: {
        primary: "#AABBCC",
        planMode: "#DDEEFF",
        selection: "#112233",
        thinking: "#445566",
        success: "#778899",
        error: "#AABBCC",
        info: "#DDEEFF",
        background: "#001122",
        surface: "#334455",
        dialogSurface: "#667788",
        thinkingBorder: "#99AABB",
        dimSeparator: "#CCDDEE",
      },
    };
    expect(sampleTheme.name).toBe("Test Theme");
    expect(Object.keys(sampleTheme.colors)).toHaveLength(REQUIRED_COLOR_KEYS.length);
  });

  test("THEMES entries match the Theme type contract (no extra/missing keys)", () => {
    for (const theme of THEMES) {
      const colorKeys = Object.keys(theme.colors).sort();
      const requiredSorted = [...REQUIRED_COLOR_KEYS].sort();
      expect(colorKeys).toEqual(requiredSorted);
    }
  });
});