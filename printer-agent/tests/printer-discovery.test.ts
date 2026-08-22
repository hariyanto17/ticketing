import test from "node:test";
import assert from "node:assert/strict";

import { getPrinterPlatformCapabilities } from "../src/printer/PrinterPlatform.js";
import { UnsupportedPrinterTransport } from "../src/printer/UnsupportedPrinterTransport.js";

test("macOS reports Windows hardware printing as unsupported", async () => {
  const capabilities = getPrinterPlatformCapabilities("darwin");
  assert.equal(capabilities.platform, "darwin");
  assert.equal(capabilities.hardwarePrintingSupported, false);
  assert.equal(capabilities.canDiscoverPrinters, false);
  assert.deepEqual(new UnsupportedPrinterTransport().discover(), []);

  await assert.rejects(
    () => new UnsupportedPrinterTransport().print({} as never, Buffer.from("test"), "job-1"),
    /HARDWARE_PRINTING_UNSUPPORTED/,
  );
});

test("Windows capability layer enables the native transport boundary", () => {
  const capabilities = getPrinterPlatformCapabilities("win32");
  assert.equal(capabilities.hardwarePrintingSupported, true);
  assert.equal(capabilities.backend, "windows-native");
});
