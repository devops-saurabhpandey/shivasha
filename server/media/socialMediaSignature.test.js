import test from "node:test";
import assert from "node:assert/strict";
import { detectSocialMediaType } from "./socialMediaSignature.js";
test("accepts matching JPEG, PNG, WEBP and GIF signatures", () => {
 assert.equal(detectSocialMediaType(Buffer.from([0xff,0xd8,0xff,0x00]), "image/jpeg"), "image");
 assert.equal(detectSocialMediaType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), "image/png"), "image");
 assert.equal(detectSocialMediaType(Buffer.from("RIFFxxxxWEBP"), "image/webp"), "image");
 assert.equal(detectSocialMediaType(Buffer.from("GIF89a"), "image/gif"), "image");
});
test("rejects MIME and file-signature mismatches, SVG and invalid buffers", () => {
 assert.equal(detectSocialMediaType(Buffer.from("GIF89a"), "image/png"), null);
 assert.equal(detectSocialMediaType(Buffer.from("<svg/>"), "image/svg+xml"), null);
 assert.equal(detectSocialMediaType("GIF89a", "image/gif"), null);
});
test("accepts supported video signatures only when declared MIME matches", () => {
 assert.equal(detectSocialMediaType(Buffer.from([0x1a,0x45,0xdf,0xa3]), "video/webm"), "video");
 assert.equal(detectSocialMediaType(Buffer.from("0000ftypisom"), "video/mp4"), "video");
 assert.equal(detectSocialMediaType(Buffer.from("0000ftypisom"), "video/quicktime"), null);
});
