import test from "node:test";
import assert from "node:assert/strict";
import { darkTheme, lightTheme, spacing, radius, typography } from "../theme";

test("Phase 8D: Theme System Design Tokens & Semantics", async (t) => {
  await t.test("1. Dark vs Light Color Token Alignment", () => {
    // Dark tokens
    assert.strictEqual(darkTheme.colors.background, "#09090b");
    assert.strictEqual(darkTheme.colors.card, "#18181b");
    assert.strictEqual(darkTheme.colors.surface, "#27272a");
    assert.strictEqual(darkTheme.colors.border, "#27272a");
    assert.strictEqual(darkTheme.colors.textPrimary, "#fafafa");
    assert.strictEqual(darkTheme.colors.primary, "#6366f1");

    // Light tokens
    assert.strictEqual(lightTheme.colors.background, "#ffffff");
    assert.strictEqual(lightTheme.colors.card, "#ffffff");
    assert.strictEqual(lightTheme.colors.surface, "#f4f4f5");
    assert.strictEqual(lightTheme.colors.border, "#e4e4e7");
    assert.strictEqual(lightTheme.colors.textPrimary, "#09090b");
    assert.strictEqual(lightTheme.colors.primary, "#4f46e5");
  });

  await t.test("2. Seat Semantic Status Invariants", () => {
    // Available
    assert.strictEqual(darkTheme.colors.seatAvailable, "#27272a");
    assert.strictEqual(lightTheme.colors.seatAvailable, "#ffffff");

    // Selected
    assert.strictEqual(darkTheme.colors.seatSelected, "#6366f1");
    assert.strictEqual(lightTheme.colors.seatSelected, "#4f46e5");

    // Hold (Amber invariant)
    assert.strictEqual(darkTheme.colors.seatHeld, "#f59e0b");
    assert.strictEqual(lightTheme.colors.seatHeld, "#fef3c7");

    // Sold (Red/Danger invariant)
    assert.strictEqual(darkTheme.colors.seatSold, "#ef4444");
    assert.strictEqual(lightTheme.colors.seatSold, "#fee2e2");

    // Disabled (Muted invariant)
    assert.strictEqual(darkTheme.colors.seatDisabled, "#3f3f46");
    assert.strictEqual(lightTheme.colors.seatDisabled, "#e4e4e7");
  });

  await t.test("3. Spacing, Radius, and Typography Tokens", () => {
    assert.strictEqual(spacing.xs, 4);
    assert.strictEqual(spacing.sm, 8);
    assert.strictEqual(spacing.md, 12);
    assert.strictEqual(spacing.lg, 16);
    assert.strictEqual(spacing.xl, 20);

    assert.strictEqual(radius.xs, 4);
    assert.strictEqual(radius.sm, 8);
    assert.strictEqual(radius.md, 12);
    assert.strictEqual(radius.full, 9999);

    assert.strictEqual(typography.h1.fontSize, 24);
    assert.strictEqual(typography.h2.fontSize, 20);
    assert.strictEqual(typography.h3.fontSize, 16);
    assert.strictEqual(typography.button.fontSize, 15);
  });
});
