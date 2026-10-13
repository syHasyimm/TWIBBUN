export const TEMPLATE_WIDTH = 1080;
export const TEMPLATE_HEIGHT = 1350;

export type PhotoState = {
  image: HTMLImageElement;
  zoom: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
};

export type RenderInput = {
  name: string;
  role: string;
  photo: PhotoState | null;
};

// Coordinates use the original template's pixels, regardless of screen size.
const PHOTO_RECT = { x: 324, y: 529, width: 439, height: 613 };
const NAME_PATCH = { x: 443, y: 1043, width: 193, height: 66 };
const ROLE_PATCH = { x: 332, y: 1167, width: 416, height: 58 };

let background: HTMLImageElement | null = null;
let foreground: HTMLCanvasElement | null = null;
let loading: Promise<void> | null = null;

export function getPhotoRect() {
  return { ...PHOTO_RECT };
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Template belum berhasil dimuat. Muat ulang halaman untuk mencoba lagi.'));
    image.src = `${import.meta.env.BASE_URL}${path}`;
  });
}

function patchRibbon(
  context: CanvasRenderingContext2D,
  clean: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
) {
  // Only the inpainted lettering areas are taken from the cleaned image.
  // All logos, event lettering, frame and other artwork keep the source pixels.
  const scaleX = clean.naturalWidth / TEMPLATE_WIDTH;
  const scaleY = clean.naturalHeight / TEMPLATE_HEIGHT;
  context.drawImage(
    clean,
    rect.x * scaleX,
    rect.y * scaleY,
    rect.width * scaleX,
    rect.height * scaleY,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );
}

export async function loadTemplate(): Promise<void> {
  if (foreground && background) return;
  if (loading) return loading;
  loading = (async () => {
    const [original, clean] = await Promise.all([
      loadImage('templates/gelora-pahlawan-original.png'),
      loadImage('templates/gelora-pahlawan-clean.png'),
    ]);
    if (original.naturalWidth !== TEMPLATE_WIDTH || original.naturalHeight !== TEMPLATE_HEIGHT) {
      throw new Error('Ukuran template tidak sesuai. Template harus berukuran 1080 × 1350 piksel.');
    }
    const overlay = document.createElement('canvas');
    overlay.width = TEMPLATE_WIDTH;
    overlay.height = TEMPLATE_HEIGHT;
    const context = overlay.getContext('2d');
    if (!context) throw new Error('Browser ini belum mendukung editor foto. Coba browser terbaru.');
    context.drawImage(original, 0, 0);
    patchRibbon(context, clean, NAME_PATCH);
    patchRibbon(context, clean, ROLE_PATCH);

    // Remove the opaque stock photo area, keeping the frame and ribbons above it.
    context.clearRect(PHOTO_RECT.x, PHOTO_RECT.y, PHOTO_RECT.width, 492);
    context.clearRect(PHOTO_RECT.x, 1130, PHOTO_RECT.width, 12);
    background = original;
    foreground = overlay;
  })().catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

function drawPhoto(context: CanvasRenderingContext2D, photo: PhotoState) {
  const rect = PHOTO_RECT;
  const rotation = ((photo.rotation % 360) + 360) % 360;
  const swapped = rotation === 90 || rotation === 270;
  const rotatedWidth = swapped ? photo.image.naturalHeight : photo.image.naturalWidth;
  const rotatedHeight = swapped ? photo.image.naturalWidth : photo.image.naturalHeight;
  const coverScale = Math.max(rect.width / rotatedWidth, rect.height / rotatedHeight);
  const scale = coverScale * Math.max(1, Math.min(photo.zoom, 3));
  const maxX = Math.max(0, (rotatedWidth * scale - rect.width) / 2);
  const maxY = Math.max(0, (rotatedHeight * scale - rect.height) / 2);
  const offsetX = Math.max(-maxX, Math.min(photo.offsetX, maxX));
  const offsetY = Math.max(-maxY, Math.min(photo.offsetY, maxY));

  context.save();
  context.beginPath();
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.clip();
  context.translate(rect.x + rect.width / 2 + offsetX, rect.y + rect.height / 2 + offsetY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(scale, scale);
  context.drawImage(photo.image, -photo.image.naturalWidth / 2, -photo.image.naturalHeight / 2);
  context.restore();
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  rawText: string,
  fallback: string,
  centerY: number,
  maxSize: number,
  minSize: number,
) {
  const text = rawText.replace(/\s+/g, ' ').trim() || fallback;
  const maxWidth = 504;
  const font = (size: number) => `700 ${size}px Arial, sans-serif`;
  let size = maxSize;
  context.font = font(size);
  while (context.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    context.font = font(size);
  }
  context.save();
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // maxWidth is a final safeguard for very long labels and wide characters.
  context.fillText(text, 540, centerY, maxWidth);
  context.restore();
}

export function renderTwibbon(canvas: HTMLCanvasElement, input: RenderInput): void {
  if (!background || !foreground) return;
  if (canvas.width !== TEMPLATE_WIDTH) canvas.width = TEMPLATE_WIDTH;
  if (canvas.height !== TEMPLATE_HEIGHT) canvas.height = TEMPLATE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Pratinjau tidak tersedia di browser ini.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
  context.drawImage(background, 0, 0);
  if (input.photo) {
    context.fillStyle = '#ffffff';
    context.fillRect(PHOTO_RECT.x, PHOTO_RECT.y, PHOTO_RECT.width, PHOTO_RECT.height);
    drawPhoto(context, input.photo);
  }
  context.drawImage(foreground, 0, 0);
  drawFittedText(context, input.name, 'Nama Anda', 1079, 58, 27);
  drawFittedText(context, input.role, 'Jabatan / Pangkalan', 1195, 40, 23);
}

export async function createExport(input: RenderInput): Promise<Blob> {
  if (!input.name.trim() || !input.role.trim() || !input.photo) {
    throw new Error('Lengkapi nama, jabatan/pangkalan, dan foto terlebih dahulu.');
  }
  await loadTemplate();
  const canvas = document.createElement('canvas');
  renderTwibbon(canvas, input);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = 0;
      canvas.height = 0;
      if (blob) resolve(blob);
      else reject(new Error('Gambar belum berhasil dibuat. Coba unduh kembali.'));
    }, 'image/png');
  });
}
