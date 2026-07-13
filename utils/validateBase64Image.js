// Validation for base64 image data-URLs before uploading to the image host.
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decoded

// Returns null if valid, or an error message string suitable for a 400 response.
function validateBase64Image(imageData) {
  if (typeof imageData !== 'string') {
    return 'Invalid image data';
  }
  const match = imageData.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) {
    return 'Invalid image data: expected a base64 data URL';
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.includes(mime)) {
    return `Unsupported image type: ${mime}. Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`;
  }
  const decodedSize = match[2].length * 0.75;
  if (decodedSize > MAX_IMAGE_BYTES) {
    return 'Image too large: maximum size is 8MB';
  }
  return null;
}

module.exports = { validateBase64Image };
