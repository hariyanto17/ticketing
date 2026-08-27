import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { ConfigService } from "../src/config/ConfigService.js";
import { PrinterAgentServer } from "../src/server/server.js";

test("printer agent API enforces auth and reports honest macOS capability", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "planet-cinema-api-"));
  const previous = process.env.PRINTER_AGENT_DATA_DIR;
  process.env.PRINTER_AGENT_DATA_DIR = dataDir;

  try {
    const config = new ConfigService();
    const server = new PrinterAgentServer(config);
    const app = server.getExpressApp();
    const deviceId = config.getDeviceId();

    const unauthorized = await request(app).get("/api/health");
    assert.equal(unauthorized.status, 401);

    const health = await request(app).get("/api/health").set("X-Printer-Agent-Device-Id", deviceId);
    assert.equal(health.status, 200);
    assert.equal(health.body.platform, "darwin");
    assert.equal(health.body.printerBackend, "unsupported");
    assert.equal(health.body.hardwarePrintingSupported, false);

    const printers = await request(app).get("/api/printers").set("X-Printer-Agent-Device-Id", deviceId);
    assert.deepEqual(printers.body.printers, []);

    const configResponse = await request(app).get("/api/config").set("X-Printer-Agent-Device-Id", deviceId);
    assert.equal(configResponse.status, 200);
    assert.equal(configResponse.body.paperWidth, 80);

    const savedConfig = await request(app)
      .put("/api/config")
      .set("X-Printer-Agent-Device-Id", deviceId)
      .send({ ticketPrinterId: null, ticketPrinter: null, paperWidth: 58, autoCut: false });
    assert.equal(savedConfig.status, 200);
    assert.equal(savedConfig.body.paperWidth, 58);
    assert.equal(savedConfig.body.autoCut, false);

    const testPrint = await request(app).post("/api/printers/test").set("X-Printer-Agent-Device-Id", deviceId);
    assert.equal(testPrint.status, 501);
    assert.equal(testPrint.body.error.code, "HARDWARE_PRINTING_UNSUPPORTED");

    const invalid = await request(app)
      .post("/api/print/ticket")
      .set("X-Printer-Agent-Device-Id", deviceId)
      .send({ ticketNumber: 42 });
    assert.equal(invalid.status, 400);

    const unsupported = await request(app)
      .post("/api/print/ticket")
      .set("X-Printer-Agent-Device-Id", deviceId)
      .send({
        jobId: "mac-job",
        ticketNumber: "PCM-1",
        movie: "Planet Cinema",
        studio: "Studio 1",
        showDate: "2026-08-21",
        showTime: "19:30",
        seat: "A1",
        row: "A",
        seatNumber: 1,
        price: 50000,
        mode: "print",
      });
    assert.equal(unsupported.status, 501);
    assert.equal(unsupported.body.error.code, "HARDWARE_PRINTING_UNSUPPORTED");

    await server.close();
  } finally {
    if (previous === undefined) delete process.env.PRINTER_AGENT_DATA_DIR;
    else process.env.PRINTER_AGENT_DATA_DIR = previous;
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
