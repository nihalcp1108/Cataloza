/**
 * Production Image Optimization Utility
 * Automatically transforms Cloudinary and external images with:
 * - f_auto (auto WebP/AVIF format based on browser support)
 * - q_auto (intelligent quality compression)
 * - w_{width}, c_limit / c_fill (responsive scaling)
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: 'limit' | 'fill' | 'scale' | 'thumb' | 'fit';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

export function getOptimizedImageUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_FALLBACK_IMAGE;
  }

  const trimmedUrl = url.trim();

  // 1. Cloudinary Optimization
  if (trimmedUrl.includes('res.cloudinary.com') && trimmedUrl.includes('/image/upload/')) {
    // Check if URL already has transformation flags
    const uploadIndex = trimmedUrl.indexOf('/image/upload/');
    const prefix = trimmedUrl.slice(0, uploadIndex + '/image/upload/'.length);
    const suffix = trimmedUrl.slice(uploadIndex + '/image/upload/'.length);

    // If already transformed with f_auto/q_auto, return as is unless custom width requested
    if (suffix.startsWith('f_auto') && !options.width) {
      return trimmedUrl;
    }

    const {
      width = 600,
      height,
      crop = height ? 'fill' : 'limit',
      quality = 'auto',
      format = 'auto',
    } = options;

    const transforms = [`f_${format}`, `q_${quality}`];
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (crop) transforms.push(`c_${crop}`);

    const transformStr = transforms.join(',') + '/';

    // If suffix already has old transformation flags before v12345/..., replace or prepend
    if (/^[a-z]_[a-z0-9_:,]+\//.test(suffix)) {
      const restOfUrl = suffix.replace(/^[a-z]_[a-z0-9_:,]+\//, '');
      return `${prefix}${transformStr}${restOfUrl}`;
    }

    return `${prefix}${transformStr}${suffix}`;
  }

  // 2. Unsplash Optimization
  if (trimmedUrl.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmedUrl);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('q', '80');
      if (options.width) {
        parsed.searchParams.set('w', options.width.toString());
      }
      return parsed.toString();
    } catch {
      return trimmedUrl;
    }
  }

  // 3. Fallback for generic image URLs
  return trimmedUrl;
}

/**
 * Generate standard responsive srcset string for Cloudinary images
 */
export function getOptimizedImageSrcSet(
  url?: string | null,
  widths: number[] = [320, 480, 640, 800, 1024]
): string {
  if (!url || !url.includes('res.cloudinary.com')) {
    return '';
  }

  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(', ');
}
