import test from "node:test";
import assert from "node:assert/strict";
import { NextFunction } from "express";

test("payment signatures and internal service authentication reject invalid credentials", async () => {
  process.env.PLATFORM_INTERNAL_API_KEY = "a-valid-test-secret-with-at-least-32-characters";
  const [{ generateMidtransSignature, verifyMidtransSignature }, { internalAuthMiddleware }] = await Promise.all([
    import("../modules/payments/midtransHelpers"),
    import("../middleware/internalAuthMiddleware"),
  ]);

  const serverKey = "test-midtrans-server-key";
  const notification = {
    order_id: "ORDER-123",
    status_code: "200",
    gross_amount: "50000.00",
    signature_key: generateMidtransSignature("ORDER-123", "200", "50000.00", serverKey),
  };

  assert.equal(verifyMidtransSignature(notification, serverKey), true);
  assert.equal(verifyMidtransSignature({ ...notification, gross_amount: "1.00" }, serverKey), false);
  assert.equal(verifyMidtransSignature(notification, ""), false);
  assert.equal(verifyMidtransSignature({ ...notification, signature_key: "invalid" }, serverKey), false);

  const runMiddleware = (apiKey?: string) => {
    let nextCalled = false;
    let nextError: Error | undefined;
    const next: NextFunction = (error) => {
      nextCalled = true;
      nextError = error instanceof Error ? error : undefined;
    };
    internalAuthMiddleware(
      { headers: apiKey ? { "x-platform-internal-key": apiKey } : {} } as any,
      {} as any,
      next
    );
    return { nextCalled, nextError };
  };

  assert.deepEqual(runMiddleware("a-valid-test-secret-with-at-least-32-characters"), {
    nextCalled: true,
    nextError: undefined,
  });
  assert.equal(runMiddleware().nextError?.message, "Invalid or missing internal service credential");
  assert.equal(runMiddleware("incorrect-secret").nextError?.message, "Invalid or missing internal service credential");
});
