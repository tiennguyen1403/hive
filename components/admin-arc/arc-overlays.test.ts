import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { TOAST_LAYER, keepOpenForToasts } from "./arc-toasts";

/**
 * The Arc back office's dialogs and drawers stay open when a toast is pressed
 * (round v5 slice 4, first fix): Radix closes an overlay on any press or
 * focus outside it, and the toast stack is outside. `ArcAdminFrame` puts the
 * stack in its own layer, and every overlay passes `keepOpenForToasts` to
 * `onInteractOutside`. A new dialog or drawer that forgets it fails here.
 */

const DIR = join("components", "admin-arc");

/** An event as Radix hands it to `onInteractOutside`, on a target that answers `closest`. */
function outsideEvent(target: unknown) {
  return { target: target as EventTarget | null, preventDefault: vi.fn() };
}

/** A pressed element: inside the toast layer or not. */
function element(insideToasts: boolean) {
  return { closest: (selector: string) => (insideToasts && selector === `[${TOAST_LAYER}]` ? {} : null) };
}

describe("keepOpenForToasts", () => {
  it("keeps the overlay open for a press or a focus inside the toast stack", () => {
    const event = outsideEvent(element(true));
    keepOpenForToasts(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("lets any other press outside close it, as Radix does", () => {
    const event = outsideEvent(element(false));
    keepOpenForToasts(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("lets a target that is not an element close it, and does not throw", () => {
    for (const target of [null, {}, { closest: "not a function" }]) {
      const event = outsideEvent(target);
      expect(() => keepOpenForToasts(event)).not.toThrow();
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });
});

describe("the Arc frame's toast layer", () => {
  it("puts the toast stack inside the element keepOpenForToasts looks for", () => {
    const frame = readFileSync(join(DIR, "ArcAdminFrame.tsx"), "utf8");
    const layer = frame.indexOf("{...{ [TOAST_LAYER]: \"\" }}");
    const stack = frame.indexOf("<ToastStack ");
    expect(layer).toBeGreaterThan(-1);
    expect(stack).toBeGreaterThan(layer);
    // The stack is the layer's child: the layer's `</div>` comes after it.
    expect(frame.indexOf("</div>", stack)).toBeGreaterThan(stack);
    expect(TOAST_LAYER).toMatch(/^data-/);
  });
});

describe("every dialog and drawer of components/admin-arc", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".tsx"));
  const count = (source: string, pattern: RegExp) => (source.match(pattern) ?? []).length;
  const overlays = (source: string) => count(source, /<(DialogContent|DrawerContent)\b/g);
  const kept = (source: string) => count(source, /onInteractOutside=\{keepOpenForToasts\}/g);

  it("finds the overlays of round v5 so far: five dialogs and three drawers", () => {
    const total = files.reduce((n, f) => n + overlays(readFileSync(join(DIR, f), "utf8")), 0);
    // Slice 5a adds the two stock drawers (`ArcStockDrawer.tsx`).
    expect(total).toBeGreaterThanOrEqual(8);
  });

  it.each(files)("%s passes keepOpenForToasts to each DialogContent and DrawerContent", (file) => {
    const source = readFileSync(join(DIR, file), "utf8");
    expect(kept(source)).toBe(overlays(source));
  });
});
