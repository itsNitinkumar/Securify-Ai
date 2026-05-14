# AWS S3 Image Storage for Steps To Reproduce

This document explains the S3-based image storage implementation for the "Steps To Reproduce" feature.

## Overview

Images for finding steps are now stored in AWS S3 instead of local filesystem. This provides:
- Scalable cloud storage
- Secure access via signed URLs
- Better performance and reliability
- No local disk space concerns

## Architecture

### Components

1. **S3 Service** (`src/services/s3.service.ts`)
   - Handles all S3 operations
   - Uploads images from memory buffer
   - Generates signed URLs for secure access
   - Deletes images from S3

2. **Step Image Model** (`src/models/step-image.model.ts`)
   - Manages image metadata in PostgreSQL
   - Stores S3 keys, not actual images
   - Links images to findings and steps

3. **Step Image Controller** (`src/controllers/step-image.controller.ts`)
   - Handles HTTP requests
   - Coordinates between S3 and database
   - Returns signed URLs to frontend

4. **Upload Routes** (`src/routes/upload.routes.ts`)
   - Uses `multer.memoryStorage()` - no local files
   - Supports both new and legacy endpoints
   - Validates file types and sizes

## S3 Key Structure

Images are organized in S3 with the following structure:

```
findings/{projectId}/{findingId}/steps/{stepId}/{timestamp}-{random}.{ext}
```

Example:
```
findings/123/456/steps/1/1778674300000-a1b2c3d4.png
```

Temporary uploads (for draft findings):
```
temp/steps/{timestamp}-{random}.{ext}
```

## Database Schema

```sql
CREATE TABLE step_images (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL,
  image_key TEXT NOT NULL,           -- S3 object key
  mime_type TEXT,
  original_name TEXT,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Important**: We store only the S3 key, NOT signed URLs. Signed URLs are generated on-demand.

## API Endpoints

### Upload Image
```
POST /api/v1/upload/findings/:findingId/steps/:stepId/image
Content-Type: multipart/form-data

Body:
- image: File (required)
- caption: string (optional)

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "imageKey": "findings/1/2/steps/3/1778674300000-abc123.png",
    "signedUrl": "https://bucket.s3.amazonaws.com/...",
    "caption": "Screenshot of login page",
    "mimeType": "image/png",
    "originalName": "screenshot.png",
    "createdAt": "2026-05-14T10:30:00Z"
  }
}
```

### Get Images for Finding
```
GET /api/v1/findings/:findingId/step-images

Response:
{
  "success": true,
  "data": [
    {
      "id": 123,
      "stepId": 1,
      "imageKey": "findings/1/2/steps/1/...",
      "signedUrl": "https://...",
      "caption": "Step 1 screenshot",
      "mimeType": "image/png",
      "originalName": "screenshot.png",
      "createdAt": "2026-05-14T10:30:00Z"
    }
  ]
}
```

### Delete Image
```
DELETE /api/v1/step-images/:imageId

Response:
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### Update Caption
```
PATCH /api/v1/step-images/:imageId/caption
Content-Type: application/json

Body:
{
  "caption": "Updated caption text"
}

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "caption": "Updated caption text",
    "updatedAt": "2026-05-14T10:35:00Z"
  }
}
```

## Upload Flow

1. **Frontend**: User uploads/pastes/drags image
2. **Multer**: Parses multipart data, stores in memory buffer
3. **Controller**: Validates finding exists
4. **S3 Service**: Uploads buffer directly to S3
5. **Database**: Saves metadata (S3 key, mime type, etc.)
6. **S3 Service**: Generates signed URL (1 hour expiry)
7. **Response**: Returns signed URL to frontend
8. **Frontend**: Displays image using signed URL

## Delete Flow

1. **Frontend**: User clicks delete
2. **Controller**: Fetches image metadata from database
3. **S3 Service**: Deletes object from S3
4. **Database**: Removes metadata record
5. **Response**: Confirms deletion

## Configuration

### Environment Variables

Add to `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=your_bucket_name_here
```

### S3 Bucket Setup

1. Create S3 bucket (keep PRIVATE)
2. Configure CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. Create IAM user with policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Security

- **Bucket is PRIVATE**: No public-read ACL
- **Access via signed URLs only**: URLs expire after 1 hour
- **File validation**: Only png, jpg, jpeg, webp allowed
- **Size limit**: 5MB maximum
- **Authentication required**: All endpoints protected

## File Validation

Allowed types:
- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`

Maximum size: 5MB

## Frontend Integration

The frontend automatically:
- Creates local preview using `URL.createObjectURL()` for immediate feedback
- Uploads to S3 via API
- Replaces preview with signed URL after upload
- Supports upload, paste, and drag & drop
- Handles errors gracefully

## Migration from Local Storage

To migrate existing local images to S3:

1. Run migration to create `step_images` table
2. Create script to:
   - Read existing images from `public/images/steps/`
   - Upload each to S3
   - Create database records
   - Update finding records to use new format
3. Remove old local files after verification

## Troubleshooting

### Upload fails with "Access Denied"
- Check AWS credentials in `.env`
- Verify IAM user has PutObject permission
- Ensure bucket name is correct

### Images not displaying
- Check signed URL expiry (default 1 hour)
- Verify CORS configuration on S3 bucket
- Check browser console for errors

### "Bucket not found" error
- Verify `S3_BUCKET_NAME` in `.env`
- Ensure bucket exists in specified region
- Check AWS region configuration

## Performance

- **Upload**: Direct memory buffer to S3 (no disk I/O)
- **Signed URLs**: Generated on-demand, cached for 1 hour
- **Parallel uploads**: Multiple images can upload simultaneously
- **CDN**: Consider CloudFront for better global performance

## Future Enhancements

- [ ] Image optimization (resize, compress)
- [ ] CloudFront CDN integration
- [ ] Batch upload support
- [ ] Image versioning
- [ ] Automatic cleanup of orphaned images
- [ ] Migration script for existing local images
