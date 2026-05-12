import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middlewares/auth';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/images/steps');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `step-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload step image
router.post('/step-image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = `/images/steps/${req.file.filename}`;
    
    return res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

// Upload base64 image
router.post('/step-image-base64', protect, (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image || !image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid base64 image data'
      });
    }

    // Extract base64 data and extension
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format'
      });
    }

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `step-${uniqueSuffix}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/images/steps/${filename}`;
    
    return res.json({
      success: true,
      data: {
        url: imageUrl,
        filename,
        size: buffer.length
      }
    });
  } catch (error: any) {
    console.error('Base64 image upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

export default router;
