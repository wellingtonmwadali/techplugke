// Minimal header parsing for PNG/JPEG data URIs — just enough to read width/height without
// pulling in an image-processing dependency. Returns null for formats it doesn't recognize
// (validation callers should treat that as "can't verify, don't block" rather than a rejection).
export function getImageDimensions(dataUri: string): { width: number; height: number } | null {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) return null;

  let buf: Buffer;
  try {
    buf = Buffer.from(dataUri.slice(commaIndex + 1), "base64");
  } catch {
    return null;
  }

  // PNG: 8-byte signature, then IHDR chunk with width/height as big-endian uint32s.
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length > 24 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: scan markers for an SOF segment (0xC0-0xCF, excluding the DHT markers C4/C8/CC).
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      const segmentLength = buf.readUInt16BE(i + 2);
      i += 2 + segmentLength;
    }
  }

  return null;
}

const MIN_DIMENSION = 200;
const MAX_DIMENSION = 6000;

export function validateImageDimensions(images: string[]): string | null {
  for (const img of images) {
    const dims = getImageDimensions(img);
    if (!dims) continue;
    if (dims.width < MIN_DIMENSION || dims.height < MIN_DIMENSION) {
      return `One of the images is too small (${dims.width}x${dims.height}px) — use at least ${MIN_DIMENSION}x${MIN_DIMENSION}px.`;
    }
    if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
      return `One of the images is too large (${dims.width}x${dims.height}px) — keep it under ${MAX_DIMENSION}x${MAX_DIMENSION}px.`;
    }
  }
  return null;
}
