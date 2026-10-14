import "./envGuard";
import test from "node:test";
import assert from "node:assert/strict";
import { validateSchedulePosterPng } from "../modules/movies/schedulePosterVideo";
import { AppError } from "../utils/errorHandler";

function createPngHeader(width: number, height: number): Buffer {
  const image = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.write("IHDR", 12, "ascii");
  image.writeUInt32BE(width, 16);
  image.writeUInt32BE(height, 20);
  return image;
}

test("validates schedule poster PNG uploads", async (t) => {
  await t.test("accepts the expected 1920x1080 PNG dimensions", () => {
    assert.doesNotThrow(() => validateSchedulePosterPng(createPngHeader(1920, 1080)));
  });

  await t.test("rejects non-PNG image data", () => {
    assert.throws(() => validateSchedulePosterPng(Buffer.alloc(24)), AppError);
  });

  await t.test("rejects unexpected image dimensions", () => {
    assert.throws(
      () => validateSchedulePosterPng(createPngHeader(1280, 720)),
      /must be 1920x1080/
    );
  });

  await t.test("rejects payloads over 10 MiB", () => {
    const image = Buffer.alloc(10 * 1024 * 1024 + 1);
    assert.throws(() => validateSchedulePosterPng(image), /exceeds the 10 MiB limit/);
  });
});
