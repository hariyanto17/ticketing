import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigService } from "../src/config/ConfigService.js";

test("ConfigService persists printer selection across instances", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "planet-cinema-printer-"));
  const previous = process.env.PRINTER_AGENT_DATA_DIR;
  process.env.PRINTER_AGENT_DATA_DIR = dataDir;

  try {
    const first = new ConfigService();
    await first.updateConfig({ ticketPrinterId: "native-printer-id", ticketPrinter: "Epson TM-T82III", paperWidth: 80, autoCut: true });

    const restarted = new ConfigService();
    assert.deepEqual(restarted.getConfig(), {
      ticketPrinterId: "native-printer-id",
      ticketPrinter: "Epson TM-T82III",
      paperWidth: 80,
      autoCut: true,
    });
  } finally {
    if (previous === undefined) delete process.env.PRINTER_AGENT_DATA_DIR;
    else process.env.PRINTER_AGENT_DATA_DIR = previous;
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
