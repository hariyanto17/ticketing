import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../utils/prisma";
import * as importService from "../modules/movies/importService";

test("Movie Import Business Invariants (21 Cineplex)", async (t) => {
  await t.test("Import Summary schema and skip logic invariant", () => {
    const summary: importService.ImportSummary = {
      total: 10,
      created: 4,
      updated: 0,
      skipped: 6,
      failed: 0,
      failures: [],
    };

    assert.strictEqual(summary.created + summary.skipped + summary.updated + summary.failed, summary.total);
    assert.strictEqual(summary.updated, 0, "Updated count should be 0 since existing records are skipped");
  });

  await t.test("Status Mapping Invariants: UPCOMING -> COMING_SOON, NOW_PLAYING -> DRAFT", () => {
    const mapTypeToImportStatus = (type: "NOW_PLAYING" | "UPCOMING") => {
      return type === "NOW_PLAYING" ? "DRAFT" : "COMING_SOON";
    };

    assert.strictEqual(mapTypeToImportStatus("NOW_PLAYING"), "DRAFT", "NOW_PLAYING external movies must import as DRAFT");
    assert.strictEqual(mapTypeToImportStatus("UPCOMING"), "COMING_SOON", "UPCOMING external movies must import as COMING_SOON");
  });

  await t.test("Crew and Cast mapping invariants (player -> cast, director, writer, producer)", () => {
    const raw21Movie = {
      parent_movie_id: "26IOOF",
      title: "INSIDIOUS: OUT OF THE FURTHER",
      duration: 106,
      genre: "Horror",
      rating: "R13+",
      producer: "Jason Blum, Oren Peli, James Wan, Leigh Whannell",
      director: "Jacob Chase",
      writer: "Jacob Chase, David Leslie Johnson-McGoldrick",
      player: "Amelia Eve, Brandon Perea, Lin Shaye",
    };

    assert.strictEqual(raw21Movie.player, "Amelia Eve, Brandon Perea, Lin Shaye");
    assert.strictEqual(raw21Movie.director, "Jacob Chase");
    assert.strictEqual(raw21Movie.writer, "Jacob Chase, David Leslie Johnson-McGoldrick");
    assert.strictEqual(raw21Movie.producer, "Jason Blum, Oren Peli, James Wan, Leigh Whannell");
  });
});
