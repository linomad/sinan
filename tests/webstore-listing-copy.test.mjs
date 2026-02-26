import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const WEBSTORE_LISTING_PATH = path.resolve(process.cwd(), "docs/WEBSTORE_LISTING.md");
const REJECTED_KEYWORDS = ["ChatGPT", "Gemini", "Doubao", "Qwen", "Perplexity", "Tencent"];

test("webstore listing copy should exist as a single source of truth", () => {
  assert.equal(
    fs.existsSync(WEBSTORE_LISTING_PATH),
    true,
    "Missing docs/WEBSTORE_LISTING.md for review-safe listing copy.",
  );
});

test("webstore listing copy should not include rejected keyword-spam terms", () => {
  const listingCopy = fs.readFileSync(WEBSTORE_LISTING_PATH, "utf8");
  const hitTerms = REJECTED_KEYWORDS.filter((term) => listingCopy.includes(term));

  assert.deepEqual(
    hitTerms,
    [],
    `Remove rejected terms from webstore listing copy: ${hitTerms.join(", ")}`,
  );
});
