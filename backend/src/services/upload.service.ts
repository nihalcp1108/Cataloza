import { cloudinary } from '../config/cloudinary';
import { config } from '../config';

export class UploadService {
  /**
   * Uploads an image buffer or base64 string to Cloudinary,
   * or returns a data URL in offline/fallback dev mode.
   */
  public static async uploadImage(
    fileBuffer: Buffer,
    mimeType: string,
    folder: string = 'wholesale_catalogue'
  ): Promise<string> {
    // If Cloudinary is configured, upload to Cloudinary
    if (config.cloudinary.isConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
          },
          (error, result) => {
            if (error) {
              console.error('[UploadService] Cloudinary upload error:', error);
              // Fallback to data URI rather than crashing
              resolve(`data:${mimeType};base64,${fileBuffer.toString('base64')}`);
            } else if (result) {
              resolve(result.secure_url);
            } else {
              reject(new Error('Cloudinary response missing secure URL'));
            }
          }
        );

        uploadStream.end(fileBuffer);
      });
    }

    // Fallback: Convert to data URI for zero-dependency local development
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  }
}
