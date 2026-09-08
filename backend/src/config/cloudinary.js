/**
 * Cloudinary configuration — Phase 2
 *
 * Initialises the Cloudinary SDK once at startup.
 * All product image uploads go to the  ordernest/products  folder.
 *
 * Required environment variables:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    logger.warn('Cloudinary credentials not set — image uploads will be disabled');
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  logger.info('Cloudinary configured', { cloud: CLOUDINARY_CLOUD_NAME });
  return true;
};

export { cloudinary, configureCloudinary };
