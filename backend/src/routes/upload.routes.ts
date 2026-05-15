import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middlewares/auth';

const router = Router();

/**
 * Multer configuration for S3 upload
 * Uses memoryStorage() to keep files in memory buffer
 * No local filesystem storage
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allowed image types: png, jpg, jpeg, webp
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (png, jpg, jpeg, webp) are allowed'));
    }
  }
});

/**
 * Upload step image to S3
 * POST /api/upload/step-image
 * 
 * Upload flow:
 * 1. Multer parses multipart form data and stores file in memory
 * 2. Uploads buffer directly to S3
 * 3. Returns imageKey (S3 key) to store in database
 * 4. Returns signedUrl for immediate preview
 * 
 * IMPORTANT: Frontend should store imageKey in database, NOT signedUrl
 */
router.post('/step-image', protect, upload.single('image'), async (req, res) => {
  try {
    const { findingId, stepId, projectId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const s3Service = require('../services/s3.service').default;
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const ext = file.originalname.split('.').pop() || 'png';

    // Generate proper S3 key structure
    let imageKey: string;

    if (findingId && stepId !== undefined && projectId) {
      // Proper structure for saved findings
      imageKey = `findings/${projectId}/${findingId}/steps/${stepId}/${timestamp}-${randomString}.${ext}`;
    } else if (findingId && stepId !== undefined) {
      // Fallback if projectId not provided
      imageKey = `findings/unknown/${findingId}/steps/${stepId}/${timestamp}-${randomString}.${ext}`;
    } else {
      // Draft/temporary upload (should be moved later when finding is saved)
      imageKey = `temp/drafts/${timestamp}-${randomString}.${ext}`;
    }

    // Upload to S3
    await s3Service.uploadImage(file.buffer, imageKey, file.mimetype);

    // Generate signed URL for immediate preview (1 hour)
    const signedUrl = await s3Service.getSignedUrl(imageKey, 3600);

    // IMPORTANT: Frontend should save imageKey, not signedUrl
    return res.json({
      success: true,
      data: {
        imageKey,        // ← Store this in database
        signedUrl,       // ← Use this for immediate preview only
        url: imageKey,   // ← For backward compatibility, return key as "url"
        filename: file.originalname,
        size: file.size
      },
      message: 'Image uploaded. Store imageKey in database, not signedUrl.'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

/**
 * Get signed URL for an S3 image key
 * POST /api/upload/get-signed-url
 * 
 * Converts S3 imageKey to a temporary signed URL for display
 */
router.post('/get-signed-url', protect, async (req, res) => {
  try {
    const { imageKey } = req.body;

    if (!imageKey) {
      return res.status(400).json({
        success: false,
        message: 'imageKey is required'
      });
    }

    const s3Service = require('../services/s3.service').default;
    
    // Generate signed URL (1 hour expiry)
    const signedUrl = await s3Service.getSignedUrl(imageKey, 3600);

    return res.json({
      success: true,
      data: {
        imageKey,
        signedUrl
      }
    });
  } catch (error: any) {
    console.error('Get signed URL error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate signed URL'
    });
  }
});

export default router;
