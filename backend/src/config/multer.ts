import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const evidenceDir = path.join(uploadsDir, 'evidence');
const reportsDir = path.join(uploadsDir, 'reports');
const logosDir = path.join(uploadsDir, 'logos');

[uploadsDir, evidenceDir, reportsDir, logosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for evidence files
const evidenceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, evidenceDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// Storage configuration for logos
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, logosDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// File filter for evidence (images, PDFs, text files, logs)
const evidenceFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'text/xml',
    'application/xml',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'));
  }
};

// File filter for logos (images only)
const logoFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed for logos.'));
  }
};

// Evidence upload configuration
export const evidenceUpload = multer({
  storage: evidenceStorage,
  fileFilter: evidenceFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Logo upload configuration
export const logoUpload = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

export { evidenceDir, reportsDir, logosDir };
