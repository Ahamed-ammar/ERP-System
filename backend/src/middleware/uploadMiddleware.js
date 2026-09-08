/**
 * Upload middleware — Phase 2: Cloudinary storage
 *
 * Images are no longer saved to Render's ephemeral disk.
 * Flow:
 *   1. Multer buffers the file in memory (no disk write)
 *   2. productController streams the buffer to Cloudinary
 *   3. Cloudinary returns a permanent HTTPS URL stored in product.imageUrl
 *
 * This means product images survive every Render deploy.
 */

import multer from 'multer';

// Use memory storage — no disk writes, buffer passed directly to Cloudinary
const storage = multer.memoryStorage();

// Only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

// Middleware for single image upload — attaches req.file with buffer
export const uploadProductImage = upload.single('image');

// Error handling for multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File size too large. Maximum size is 5MB.' },
      });
    }
  }
  if (error?.message?.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILE_TYPE', message: error.message },
    });
  }
  next(error);
};
