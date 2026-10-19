/**
 * Image compression helper to optimize student avatar photos
 * Resizes large images (e.g. from camera/phone) down to standard avatar dimensions (max 360x360)
 * and compresses as high-quality JPEG (~20-40 KB).
 * This ensures:
 * - Instant uploads even on slow mobile networks
 * - Fits well within Firebase Firestore document limit (1 MB)
 * - Fits easily within localStorage quotas
 * - Crystal clear quality inside the circular avatar display
 */
export const compressAvatarImage = (
  file: File,
  maxWidth = 360,
  maxHeight = 360,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserving dimensions fitting within maxWidth x maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with chosen quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
