// Images are stored as base64 data URIs directly on Mongo documents (no external storage
// provider). Keep uploads small — everything here rides in the request body and the document
// itself, both of which have practical size ceilings.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB per image
const MIN_DIMENSION = 200;
const MAX_DIMENSION = 6000;

function checkDimensions(file: File, dataUrl: string, minDimension: number, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < minDimension || img.naturalHeight < minDimension) {
        reject(
          new Error(
            `${file.name} is too small (${img.naturalWidth}x${img.naturalHeight}px) — use at least ${minDimension}x${minDimension}px.`
          )
        );
        return;
      }
      if (img.naturalWidth > maxDimension || img.naturalHeight > maxDimension) {
        reject(
          new Error(
            `${file.name} is too large (${img.naturalWidth}x${img.naturalHeight}px) — keep it under ${maxDimension}x${maxDimension}px.`
          )
        );
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    img.src = dataUrl;
  });
}

function readAsDataUrl(
  file: File,
  { maxBytes, minDimension, maxDimension }: { maxBytes: number; minDimension: number; maxDimension: number }
): Promise<string> {
  if (file.size > maxBytes) {
    return Promise.reject(
      new Error(`${file.name} is larger than ${Math.round(maxBytes / (1024 * 1024))}MB — please use a smaller image.`)
    );
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    reader.readAsDataURL(file);
  }).then((dataUrl) => checkDimensions(file, dataUrl, minDimension, maxDimension));
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return readAsDataUrl(file, { maxBytes: MAX_IMAGE_BYTES, minDimension: MIN_DIMENSION, maxDimension: MAX_DIMENSION });
}

// Logos are typically small square/wordmark files, well under product-photo dimensions —
// looser minimum than product images, smaller max size since it's rendered tiny in the header.
const MAX_LOGO_BYTES = 1 * 1024 * 1024; // 1MB
const MIN_LOGO_DIMENSION = 32;
const MAX_LOGO_DIMENSION = 2000;

export function readLogoAsDataUrl(file: File): Promise<string> {
  return readAsDataUrl(file, { maxBytes: MAX_LOGO_BYTES, minDimension: MIN_LOGO_DIMENSION, maxDimension: MAX_LOGO_DIMENSION });
}
