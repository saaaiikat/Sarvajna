import { describe, test, expect, vi } from "vitest";

/**
 * Tests for the keyboard-layer stack management logic.
 *
 * The KeyboardLayerProvider manages a stack of layer IDs ("base", "command",
 * "dialog", etc.) and exposes push/pop/isTopLayer operations. These tests
 * validate the algorithmic behaviour extracted from that implementation
 * so we can verify correctness without pulling in terminal UI dependencies.
 */

// ─── Replicate the pure stack logic from keyboard-layer/index.tsx ──────────

function createKeyboardLayerStack(initial: string[] = ["base"]) {
  let stack = [...initial];

  function push(id: string): void {
    if (!stack.includes(id)) {
      stack = [...stack, id];
    }
  }

  function pop(id: string): void {
    stack = stack.filter((layer) => layer !== id);
  }

  function isTopLayer(id: string): boolean {
    return stack.length === 0 || stack[stack.length - 1] === id;
  }

  function getStack(): readonly string[] {
    return [...stack];
  }

  return { push, pop, isTopLayer, getStack };
}

// ─── Replicate the responder-chain logic from keyboard-layer/index.tsx ──────

function createResponderChain() {
  const responders = new Map<string, () => boolean>();

  function setResponder(id: string, responder: (() => boolean) | null): void {
    if (responder) {
      responders.set(id, responder);
    } else {
      responders.delete(id);
    }
  }

  /**
   * Walk the stack from top to bottom, calling each responder until one
   * returns true (handled) or we exhaust the stack.
   */
  function handleCtrlC(stack: readonly string[]): boolean {
    for (let i = stack.length - 1; i >= 0; i--) {
      const layerId = stack[i]!;
      const responder = responders.get(layerId);
      if (responder && responder()) {
        return true;
      }
    }
    return false;
  }

  return { setResponder, handleCtrlC };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("keyboard-layer stack: initial state", () => {
  test("starts with ['base'] in the stack", () => {
    const { getStack } = createKeyboardLayerStack();
    expect(getStack()).toEqual(["base"]);
  });

  test("'base' is the top layer initially", () => {
    const { isTopLayer } = createKeyboardLayerStack();
    expect(isTopLayer("base")).toBe(true);
  });

  test("a non-existent layer is not the top layer initially", () => {
    const { isTopLayer } = createKeyboardLayerStack();
    expect(isTopLayer("dialog")).toBe(false);
  });
});

describe("keyboard-layer stack: push", () => {
  test("push adds a new id to the top of the stack", () => {
    const { push, getStack } = createKeyboardLayerStack();
    push("dialog");
    expect(getStack()).toEqual(["base", "dialog"]);
  });

  test("push is idempotent: pushing the same id twice does not duplicate it", () => {
    const { push, getStack } = createKeyboardLayerStack();
    push("command");
    push("command");
    expect(getStack()).toEqual(["base", "command"]);
  });

  test("pushing 'base' when it already exists leaves the stack unchanged", () => {
    const { push, getStack } = createKeyboardLayerStack();
    push("base");
    expect(getStack()).toEqual(["base"]);
  });

  test("multiple different layers can be pushed in order", () => {
    const { push, getStack } = createKeyboardLayerStack();
    push("command");
    push("dialog");
    expect(getStack()).toEqual(["base", "command", "dialog"]);
  });
});

describe("keyboard-layer stack: pop", () => {
  test("pop removes the specified id from the stack", () => {
    const { push, pop, getStack } = createKeyboardLayerStack();
    push("dialog");
    pop("dialog");
    expect(getStack()).toEqual(["base"]);
  });

  test("popping an id that is not in the stack leaves it unchanged", () => {
    const { pop, getStack } = createKeyboardLayerStack();
    pop("nonexistent");
    expect(getStack()).toEqual(["base"]);
  });

  test("pop removes only the specified id when multiple layers are present", () => {
    const { push, pop, getStack } = createKeyboardLayerStack();
    push("command");
    push("dialog");
    pop("command");
    expect(getStack()).toEqual(["base", "dialog"]);
  });

  test("popping 'base' removes it from the stack", () => {
    const { pop, getStack } = createKeyboardLayerStack();
    pop("base");
    expect(getStack()).toEqual([]);
  });
});

describe("keyboard-layer stack: isTopLayer", () => {
  test("after pushing a layer it becomes the top layer", () => {
    const { push, isTopLayer } = createKeyboardLayerStack();
    push("dialog");
    expect(isTopLayer("dialog")).toBe(true);
    expect(isTopLayer("base")).toBe(false);
  });

  test("after popping the top layer the previous layer is top again", () => {
    const { push, pop, isTopLayer } = createKeyboardLayerStack();
    push("command");
    pop("command");
    expect(isTopLayer("base")).toBe(true);
  });

  test("with an empty stack isTopLayer returns true for any id", () => {
    // Per the implementation: stack.length === 0 returns true
    const { pop, isTopLayer } = createKeyboardLayerStack();
    pop("base");
    expect(isTopLayer("anything")).toBe(true);
  });

  test("isTopLayer returns false for a middle layer", () => {
    const { push, isTopLayer } = createKeyboardLayerStack();
    push("command");
    push("dialog");
    expect(isTopLayer("command")).toBe(false);
    expect(isTopLayer("base")).toBe(false);
    expect(isTopLayer("dialog")).toBe(true);
  });
});

describe("keyboard-layer stack: push-pop round trips", () => {
  test("push then pop restores the original stack", () => {
    const { push, pop, getStack } = createKeyboardLayerStack();
    const before = [...getStack()];
    push("temp");
    pop("temp");
    expect(getStack()).toEqual(before);
  });

  test("nested push/pop sequence ends up at original state", () => {
    const { push, pop, getStack } = createKeyboardLayerStack();
    push("command");
    push("dialog");
    pop("dialog");
    pop("command");
    expect(getStack()).toEqual(["base"]);
  });
});

describe("responder chain: ctrl+c handling", () => {
  test("calls the top-layer responder first", () => {
    const { setResponder, handleCtrlC } = createResponderChain();
    const calls: string[] = [];

    setResponder("base", () => { calls.push("base"); return false; });
    setResponder("dialog", () => { calls.push("dialog"); return true; });

    const stack = ["base", "dialog"] as const;
    const handled = handleCtrlC(stack);

    expect(handled).toBe(true);
    expect(calls).toEqual(["dialog"]);
  });

  test("falls through to the next layer when the top responder returns false", () => {
    const { setResponder, handleCtrlC } = createResponderChain();
    const calls: string[] = [];

    setResponder("base", () => { calls.push("base"); return true; });
    setResponder("command", () => { calls.push("command"); return false; });

    const stack = ["base", "command"] as const;
    const handled = handleCtrlC(stack);

    expect(handled).toBe(true);
    expect(calls).toEqual(["command", "base"]);
  });

  test("returns false when no responder handles the event", () => {
    const { handleCtrlC } = createResponderChain();
    const handled = handleCtrlC(["base"]);
    expect(handled).toBe(false);
  });

  test("setResponder with null removes the responder", () => {
    const { setResponder, handleCtrlC } = createResponderChain();
    setResponder("base", () => true);
    setResponder("base", null);
    const handled = handleCtrlC(["base"]);
    expect(handled).toBe(false);
  });

  test("responder registered for a layer not in stack is never called", () => {
    const { setResponder, handleCtrlC } = createResponderChain();
    let called = false;
    setResponder("dialog", () => { called = true; return true; });

    // 'dialog' is not in this stack
    handleCtrlC(["base"]);
    expect(called).toBe(false);
  });

  test("empty stack produces no calls and returns false", () => {
    const { setResponder, handleCtrlC } = createResponderChain();
    setResponder("base", () => true);
    const handled = handleCtrlC([]);
    expect(handled).toBe(false);
  });
});