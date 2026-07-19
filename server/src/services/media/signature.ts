/**
 * Lightweight magic-byte validation for uploads — verifies the file's real signature
 * matches the declared MIME type, so validation never relies on a spoofable filename
 * extension or client-provided Content-Type alone. Pure + dependency-free.
 */

/** Sniff the image type from the leading bytes. Returns a canonical MIME or null. */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) {
    // SVG (text) can be tiny; check it before bailing on length.
    return looksLikeSvg(buf) ? 'image/svg+xml' : null;
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // WEBP: "RIFF" .... "WEBP"
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  // AVIF: ISO-BMFF box "ftyp" at offset 4 with an "avif"/"avis" brand
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return looksLikeSvg(buf) ? 'image/svg+xml' : null;
}

function looksLikeSvg(buf: Buffer): boolean {
  const head = buf.toString('utf8', 0, Math.min(buf.length, 256)).trimStart().toLowerCase();
  return head.startsWith('<?xml') || head.startsWith('<svg') || head.includes('<svg');
}

/** jpeg and jpg are the same bytes; treat as equivalent when comparing to the declared type. */
export function mimeMatchesSignature(declared: string, sniffed: string | null): boolean {
  if (!sniffed) return false;
  const norm = (m: string): string => (m === 'image/jpg' ? 'image/jpeg' : m);
  return norm(declared) === norm(sniffed);
}
