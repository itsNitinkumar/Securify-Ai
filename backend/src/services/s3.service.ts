import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env';
import crypto from 'crypto';

/**
 * S3 Storage Service
 * Handles all S3 operations for step images
 * - Upload images to S3 from memory buffer
 * - Generate signed URLs for secure image access
 * - Delete images from S3
 */
class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Initialize S3 client with credentials from environment
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.bucketName = config.aws.s3BucketName;
  }

  /**
   * Generate S3 key for step image
   * Structure: findings/{projectId}/{findingId}/steps/{stepId}/{timestamp}-{random}.{ext}
   */
  generateImageKey(projectId: number, findingId: number, stepId: number, originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = originalName.split('.').pop() || 'png';
    return `findings/${projectId}/${findingId}/steps/${stepId}/${timestamp}-${randomString}.${ext}`;
  }

  /**
   * Upload image buffer to S3
   * @param buffer - Image file buffer from multer memory storage
   * @param key - S3 object key (path)
   * @param mimeType - Image MIME type
   * @returns S3 object key
   */
  async uploadImage(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Bucket is PRIVATE - no public-read ACL
        // Access via signed URLs only
      });

      await this.s3Client.send(command);
      return key;
    } catch (error: any) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload image to S3: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for secure image access
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error: any) {
      console.error('Signed URL generation error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete image from S3
   * @param key - S3 object key
   */
  async deleteImage(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete image from S3: ${error.message}`);
    }
  }

  /**
   * Generate signed URLs for multiple images
   * @param keys - Array of S3 object keys
   * @returns Map of key to signed URL
   */
  async getSignedUrls(keys: string[]): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();
    
    await Promise.all(
      keys.map(async (key) => {
        try {
          const url = await this.getSignedUrl(key);
          urlMap.set(key, url);
        } catch (error) {
          console.error(`Failed to generate signed URL for ${key}:`, error);
        }
      })
    );

    return urlMap;
  }
}

export default new S3Service();
