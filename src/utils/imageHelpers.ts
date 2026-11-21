export async function compressImageToDataUrl(
  file: File,
  maxDimension = 960,
  maxChars = 320_000
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file (PNG, JPG, or WebP).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image.'));
    el.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable for image processing.');
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let output = canvas.toDataURL('image/jpeg', quality);
  while (output.length > maxChars && quality > 0.3) {
    quality -= 0.12;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > maxChars) {
    throw new Error('Image is still too large after compression. Please use a smaller image.');
  }

  return output;
}

export function buildStylizedQrSvgDataUrl(label: string, seedText: string): string {
  // Deterministic geometric QR-like matrix SVG for default merchant QR slots
  // Admins can replace this with their actual eSewa/Khalti/UPI QR image anytime
  const size = 21;
  const cell = 8;
  const pad = 16;
  const total = size * cell + pad * 2;
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const rects: string[] = [];
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= size - 7) ||
    (r >= size - 7 && c < 7);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let filled = false;
      if (isFinder(r, c)) {
        const lr = r >= size - 7 ? r - (size - 7) : r;
        const lc = c >= size - 7 ? c - (size - 7) : c;
        filled =
          lr === 0 ||
          lr === 6 ||
          lc === 0 ||
          lc === 6 ||
          (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else {
        const v = Math.abs(Math.imul(hash ^ (r * 31 + c * 17), 2654435761));
        filled = v % 11 < 5;
      }
      if (filled) {
        rects.push(
          `<rect x="${pad + c * cell}" y="${pad + r * cell}" width="${cell}" height="${cell}" fill="#0f172a" rx="1"/>`
        );
      }
    }
  }

  const safeLabel = label.replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total + 26}" viewBox="0 0 ${total} ${total + 26}"><rect width="100%" height="100%" fill="#ffffff" rx="12"/>${rects.join('')}<text x="${total / 2}" y="${total + 14}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#334155">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
