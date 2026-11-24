const SIGNATURES = {
  "video/webm": buffer => buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  "video/ogg": buffer => buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS",
  "video/mp4": buffer => buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp" && buffer.subarray(8, 12).toString("ascii") !== "qt  ",
  "video/quicktime": buffer => buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp" && buffer.subarray(8, 12).toString("ascii") === "qt  "
};

export function hasValidVideoSignature(buffer, declaredMimeType) {
  if (!Buffer.isBuffer(buffer) || !SIGNATURES[declaredMimeType]) return false;
  return SIGNATURES[declaredMimeType](buffer);
}
