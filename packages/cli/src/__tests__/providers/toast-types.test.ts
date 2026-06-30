import { describe, test, expect } from "vitest";
import { DEFAULT_DURATION } from "../../providers/toast/types";
import type { ToastOptions, ToastVariant } from "../../providers/toast/types";

describe("DEFAULT_DURATION", () => {
  test("is a positive number", () => {
    expect(typeof DEFAULT_DURATION).toBe("number");
    expect(DEFAULT_DURATION).toBeGreaterThan(0);
  });

  test("is 3000 milliseconds", () => {
    expect(DEFAULT_DURATION).toBe(3000);
  });

  test("is at least 1 second", () => {
    expect(DEFAULT_DURATION).toBeGreaterThanOrEqual(1000);
  });
});

describe("ToastVariant type", () => {
  test("accepts success variant", () => {
    const variant: ToastVariant = "success";
    expect(variant).toBe("success");
  });

  test("accepts error variant", () => {
    const variant: ToastVariant = "error";
    expect(variant).toBe("error");
  });

  test("accepts info variant", () => {
    const variant: ToastVariant = "info";
    expect(variant).toBe("info");
  });

  test("all valid variants are distinct strings", () => {
    const variants: ToastVariant[] = ["success", "error", "info"];
    const unique = new Set(variants);
    expect(unique.size).toBe(3);
  });
});

describe("ToastOptions type", () => {
  test("a minimal ToastOptions with only message is valid", () => {
    const opts: ToastOptions = { message: "Hello" };
    expect(opts.message).toBe("Hello");
    expect(opts.variant).toBeUndefined();
    expect(opts.duration).toBeUndefined();
  });

  test("a full ToastOptions with all fields is valid", () => {
    const opts: ToastOptions = {
      message: "Operation succeeded",
      variant: "success",
      duration: 5000,
    };
    expect(opts.message).toBe("Operation succeeded");
    expect(opts.variant).toBe("success");
    expect(opts.duration).toBe(5000);
  });

  test("ToastOptions with error variant is valid", () => {
    const opts: ToastOptions = {
      message: "Something went wrong",
      variant: "error",
    };
    expect(opts.variant).toBe("error");
  });

  test("ToastOptions with info variant is valid", () => {
    const opts: ToastOptions = {
      message: "FYI",
      variant: "info",
    };
    expect(opts.variant).toBe("info");
  });

  test("message can be an empty string", () => {
    const opts: ToastOptions = { message: "" };
    expect(opts.message).toBe("");
  });

  test("custom duration overrides DEFAULT_DURATION semantics", () => {
    const opts: ToastOptions = { message: "Quick", duration: 500 };
    expect(opts.duration).toBeLessThan(DEFAULT_DURATION);
  });
});