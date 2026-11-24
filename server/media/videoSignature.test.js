import test from "node:test";
import assert from "node:assert/strict";
import { hasValidVideoSignature } from "./videoSignature.js";

test("accepts WebM EBML signature", () => {
  assert.equal(hasValidVideoSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]), "video/webm"), true);
});
test("accepts Ogg container signature", () => {
  assert.equal(hasValidVideoSignature(Buffer.from("OggSxxxx"), "video/ogg"), true);
});
test("accepts MP4 ftyp signature and rejects QuickTime brand mismatch", () => {
  assert.equal(hasValidVideoSignature(Buffer.from("0000ftypisom"), "video/mp4"), true);
  assert.equal(hasValidVideoSignature(Buffer.from("0000ftypqt  "), "video/mp4"), false);
});
test("accepts QuickTime brand and rejects MP4 brand mismatch", () => {
  assert.equal(hasValidVideoSignature(Buffer.from("0000ftypqt  "), "video/quicktime"), true);
  assert.equal(hasValidVideoSignature(Buffer.from("0000ftypisom"), "video/quicktime"), false);
});
test("rejects short, unsupported and non-buffer input", () => {
  assert.equal(hasValidVideoSignature(Buffer.from("Ogg"), "video/ogg"), false);
  assert.equal(hasValidVideoSignature(Buffer.from("OggS"), "application/octet-stream"), false);
  assert.equal(hasValidVideoSignature("OggS", "video/ogg"), false);
});
