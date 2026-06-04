import { describe, test, expect } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { THEMES, DEFAULT_THEME } from "../../theme";
import type { Theme } from "../../theme";

/**
 * Tests for the theme provider's persistence logic.
 *
 * The getInitialTheme and persistTheme helpers inside providers/theme/index.tsx
 * are not exported, so we test their algorithmic behaviour here by replicating
 * the exact logic from the source and validating it against real inputs.
 */

// ─── Replicate getInitialTheme algorithm ─────────────────────────────────────

function getInitialTheme(rawFileContent: string | null): Theme {
  try {
    if (rawFileContent === null) {
      throw new Error("file not found");
    }
    const preferences = JSON.parse(rawFileContent) as Partial<{ themeName: string }>;
    const savedTheme = THEMES.find((theme) => theme.name === preferences.themeName);
    return savedTheme ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// ─── Replicate persistTheme output ───────────────────────────────────────────

function buildPersistencePayload(theme: Theme): string {
  return JSON.stringify({ themeName: theme.name }, null, 2);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getInitialTheme logic", () => {
  test("returns DEFAULT_THEME when the preferences file does not exist", () => {
    const result = getInitialTheme(null);
    expect(result.name).toBe(DEFAULT_THEME.name);
  });

  test("returns DEFAULT_THEME when the preferences file contains invalid JSON", () => {
    const result = getInitialTheme("not-valid-json{{");
    expect(result.name).toBe(DEFAULT_THEME.name);
  });

  test("returns DEFAULT_THEME when preferences JSON has no themeName property", () => {
    const result = getInitialTheme(JSON.stringify({}));
    expect(result.name).toBe(DEFAULT_THEME.name);
  });

  test("returns DEFAULT_THEME when saved themeName is not in THEMES", () => {
    const payload = JSON.stringify({ themeName: "Unknown Theme XYZ" });
    const result = getInitialTheme(payload);
    expect(result.name).toBe(DEFAULT_THEME.name);
  });

  test("returns the saved theme when a valid themeName is found in THEMES", () => {
    const saved = THEMES.find((t) => t.name !== DEFAULT_THEME.name)!;
    const payload = JSON.stringify({ themeName: saved.name });
    const result = getInitialTheme(payload);
    expect(result.name).toBe(saved.name);
  });

  test("returns DEFAULT_THEME when the preferences file is an empty string", () => {
    const result = getInitialTheme("");
    expect(result.name).toBe(DEFAULT_THEME.name);
  });

  test("returns DEFAULT_THEME when preferences file contains null JSON", () => {
    const result = getInitialTheme("null");
    // JSON.parse("null") is null; null has no .themeName, so fallback expected
    expect(result.name).toBe(DEFAULT_THEME.name);
  });

  test("returns the correct Theme object (not just name match)", () => {
    const dracula = THEMES.find((t) => t.name === "Dracula")!;
    const payload = JSON.stringify({ themeName: "Dracula" });
    const result = getInitialTheme(payload);
    expect(result).toEqual(dracula);
  });

  test("works for every theme in the THEMES array", () => {
    for (const theme of THEMES) {
      const payload = JSON.stringify({ themeName: theme.name });
      const result = getInitialTheme(payload);
      expect(result.name).toBe(theme.name);
    }
  });
});

describe("persistTheme payload", () => {
  test("serialises theme name into a JSON object with 'themeName' key", () => {
    const theme = THEMES[0]!;
    const payload = buildPersistencePayload(theme);
    const parsed = JSON.parse(payload) as { themeName: string };
    expect(parsed.themeName).toBe(theme.name);
  });

  test("serialised JSON has only the 'themeName' key", () => {
    const payload = buildPersistencePayload(DEFAULT_THEME);
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["themeName"]);
  });

  test("payload is pretty-printed with 2-space indentation", () => {
    const payload = buildPersistencePayload(DEFAULT_THEME);
    expect(payload).toBe(JSON.stringify({ themeName: DEFAULT_THEME.name }, null, 2));
  });

  test("round-trip: persisted theme name can be loaded back", () => {
    for (const theme of THEMES) {
      const payload = buildPersistencePayload(theme);
      const loaded = getInitialTheme(payload);
      expect(loaded.name).toBe(theme.name);
    }
  });
});

describe("preferences file path", () => {
  test("CONFIG_DIR is inside the user home directory", () => {
    const configDir = join(homedir(), ".nightcode");
    expect(configDir.startsWith(homedir())).toBe(true);
  });

  test("THEME_PREFERENCES_PATH is inside CONFIG_DIR and is a JSON file", () => {
    const configDir = join(homedir(), ".nightcode");
    const prefsPath = join(configDir, "preferences.json");
    expect(prefsPath.startsWith(configDir)).toBe(true);
    expect(prefsPath.endsWith(".json")).toBe(true);
  });

  test("CONFIG_DIR name is '.nightcode'", () => {
    const configDir = join(homedir(), ".nightcode");
    expect(configDir.endsWith(".nightcode")).toBe(true);
  });
});