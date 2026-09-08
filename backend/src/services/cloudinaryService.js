/**
 * Cloudinary Service — Phase 2
 *
 * Wraps Cloudinary upload and destroy calls so controllers
 * don't need to know the SDK details.
 */

import { cloudinary } from '../config/cloudinary.js';
import logger from '../utils/logger.js';

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param {Buffer} buffer       — file buffer from multer memoryStorage
 * @param {string} mimeType     — e.g. 'image/jpeg'
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadImageToCloudinary = (buffer, mimeType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ordernest/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          // Resize to max 800×800, preserve aspect ratio, auto quality
          { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed', { error: error.message });
          return reject(error);
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary by its public ID.
 * Extracts the public ID from a Cloudinary URL if a full URL is passed.
 *
 * @param {string} publicIdOrUrl  — Cloudinary public_id or full https URL
 */
export const deleteImageFromCloudinary = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return;

  // If it's a full URL, extract the public_id
  // Cloudinary URLs look like: https://res.cloudinary.com/<cloud>/image/upload/v123/ordernest/products/abc123.jpg
  let publicId = publicIdOrUrl;
  if (publicIdOrUrl.startsWith('http')) {
    // Extract the path after /upload/vXXX/ and remove the extension
    const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (match) {
      publicId = match[1]; // e.g. ordernest/products/abc123
    } else {
      logger.warn('Could not parse Cloudinary public_id from URL', { url: publicIdOrUrl });
      return;
    }
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('Cloudinary image deleted', { publicId });
  } catch (error) {
    // Non-fatal — log and continue
    logger.warn('Cloudinary delete failed (non-fatal)', { publicId, error: error.message });
  }
};
