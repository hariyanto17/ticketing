import test from "node:test";
import assert from "node:assert/strict";
import { sso } from "../modules/auth/controller";
import { prisma } from "../config/prisma";

test("Ticketing SSO authentication unit flow", async (t) => {
  await t.test("Verify: exchange is resolved correctly and local user created", async () => {
    const originalFetch = global.fetch;
    const mockPlatformUserId = `ticketing-sso-${Date.now()}`;
    const mockEmail = `ticketing-sso-${Date.now()}@example.com`;

    global.fetch = async (url: any, options: any) => {
      if (url.toString().includes("/api/applications/exchange")) {
        return {
          ok: true,
          json: async () => ({
            status: "success",
            data: {
              id: mockPlatformUserId,
              email: mockEmail,
              name: "SSO Ticket Admin",
              application: {
                code: "TICKETING",
                role: "TICKETING_ADMINISTRATOR",
                permissions: []
              }
            }
          })
        } as any;
      }
      return originalFetch(url, options);
    };

    try {
      const mockReq = {
        body: { code: "valid-sso-code" }
      } as any;

      let responseData: any = null;
      const mockRes = {
        cookie: () => {},
        status: function() { return this; },
        json: function(payload: any) {
          responseData = payload;
          return this;
        }
      } as any;

      await sso(mockReq, mockRes);

      assert.ok(responseData, "Response should be returned");
      assert.strictEqual(responseData.status, "success");
      assert.strictEqual(responseData.data.user.name, "SSO Ticket Admin");
      assert.strictEqual(responseData.data.user.role, "Admin");

      const dbUser = await prisma.user.findUnique({
        where: { platformUserId: mockPlatformUserId }
      });
      assert.ok(dbUser, "User should be created in local DB");
      assert.strictEqual(dbUser?.name, "SSO Ticket Admin");

      await prisma.user.delete({ where: { id: dbUser.id } });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
