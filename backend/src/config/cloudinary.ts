import { v2 as cloudinary } from 'cloudinary';
import { config } from './index';

if (config.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  console.log('[Cloudinary] Cloudinary configured successfully.');
} else {
  console.log('[Cloudinary] Cloudinary credentials not provided. Media service will use local Base64/mock data storage.');
}

export { cloudinary };
