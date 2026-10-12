import test from "node:test";
import assert from "node:assert/strict";
import { parseAllowedMoviePosterUrl } from "../modules/movies/posterProxy";
import { AppError } from "../utils/errorHandler";

test("movie poster proxy accepts only approved Cinema21 poster URLs", async (t) => {
  await t.test("accepts an approved HTTPS movie image", () => {
    const url = parseAllowedMoviePosterUrl(
      "https://nos.jkt-1.neo.id/media.cinema21.co.id/movie-images/26SREG.jpg"
    );

    assert.equal(url.hostname, "nos.jkt-1.neo.id");
    assert.equal(url.pathname, "/media.cinema21.co.id/movie-images/26SREG.jpg");
  });

  const rejectedUrls = [
    "http://nos.jkt-1.neo.id/media.cinema21.co.id/movie-images/26SREG.jpg",
    "https://example.com/media.cinema21.co.id/movie-images/26SREG.jpg",
    "https://nos.jkt-1.neo.id/other/26SREG.jpg",
    "https://nos.jkt-1.neo.id/media.cinema21.co.id/movie-images/26SREG.svg",
    "https://user@nos.jkt-1.neo.id/media.cinema21.co.id/movie-images/26SREG.jpg",
    "https://nos.jkt-1.neo.id:444/media.cinema21.co.id/movie-images/26SREG.jpg",
    "https://nos.jkt-1.neo.id/media.cinema21.co.id/movie-images/26SREG.jpg?redirect=https://example.com",
  ];

  for (const source of rejectedUrls) {
    await t.test(`rejects ${source}`, () => {
      assert.throws(() => parseAllowedMoviePosterUrl(source), AppError);
    });
  }
});
